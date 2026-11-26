-- Favor Cards: database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, then Run.
-- Safe to run again: it only creates what is missing and replaces functions.

create extension if not exists pgcrypto;

-- Who is Partner A and who is Partner B ---------------------------------
create table if not exists public.members (
  slot       text primary key check (slot in ('A','B')),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  name       text not null default '',
  joined_at  timestamptz not null default now()
);

-- Cards --------------------------------------------------------------------
create table if not exists public.cards (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (char_length(title) between 1 and 40),
  message        text not null check (char_length(message) between 1 and 140),
  lim            int  not null check (lim between 1 and 99),
  expiry         date,
  design         text not null default 'sweet',
  creator        text not null check (creator in ('A','B')),
  recipient      text check (recipient in ('A','B')),
  sent_at        timestamptz,
  uses_redeemed  int  not null default 0,
  ask_pending    boolean not null default false,
  log            jsonb not null default '[]'::jsonb,
  seen           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

-- In-app notifications -----------------------------------------------------
create table if not exists public.notifs (
  id          uuid primary key default gen_random_uuid(),
  to_slot     text not null check (to_slot in ('A','B')),
  type        text not null check (type in ('received','asked','redeemed')),
  card_id     uuid references public.cards(id) on delete cascade,
  text        text not null,
  read        boolean not null default false,
  pushed      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifs_to_slot_idx on public.notifs (to_slot, created_at desc);

-- Phones that receive push notifications -----------------------------------
create table if not exists public.push_subs (
  endpoint      text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  slot          text not null check (slot in ('A','B')),
  subscription  jsonb not null,
  created_at    timestamptz not null default now()
);

-- Helpers ------------------------------------------------------------------
create or replace function public.my_slot() returns text
language sql stable security definer set search_path = public as $$
  select slot from public.members where user_id = auth.uid()
$$;

create or replace function public.slot_name(s text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select name from public.members where slot = s), ''), 'Partner ' || s)
$$;

create or replace function public.now_ms() returns bigint
language sql stable as $$ select (extract(epoch from now()) * 1000)::bigint $$;

-- Row level security: only the two members can see anything -----------------
alter table public.members   enable row level security;
alter table public.cards     enable row level security;
alter table public.notifs    enable row level security;
alter table public.push_subs enable row level security;

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (true);

drop policy if exists cards_read on public.cards;
create policy cards_read on public.cards for select to authenticated
  using (public.my_slot() is not null and (creator = public.my_slot() or recipient = public.my_slot()));

drop policy if exists cards_insert on public.cards;
create policy cards_insert on public.cards for insert to authenticated
  with check (creator = public.my_slot() and sent_at is null and recipient is null
              and uses_redeemed = 0 and ask_pending = false);

drop policy if exists cards_update_draft on public.cards;
create policy cards_update_draft on public.cards for update to authenticated
  using (creator = public.my_slot() and sent_at is null)
  with check (creator = public.my_slot() and sent_at is null and recipient is null
              and uses_redeemed = 0 and ask_pending = false);

drop policy if exists cards_delete_draft on public.cards;
create policy cards_delete_draft on public.cards for delete to authenticated
  using (creator = public.my_slot() and sent_at is null);

drop policy if exists notifs_read on public.notifs;
create policy notifs_read on public.notifs for select to authenticated
  using (to_slot = public.my_slot());

drop policy if exists subs_read on public.push_subs;
create policy subs_read on public.push_subs for select to authenticated using (user_id = auth.uid());
drop policy if exists subs_insert on public.push_subs;
create policy subs_insert on public.push_subs for insert to authenticated
  with check (user_id = auth.uid() and slot = public.my_slot());
drop policy if exists subs_update on public.push_subs;
create policy subs_update on public.push_subs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and slot = public.my_slot());
drop policy if exists subs_delete on public.push_subs;
create policy subs_delete on public.push_subs for delete to authenticated using (user_id = auth.uid());

-- Actions (each checks who may do it, and writes the log and notification) --
create or replace function public.claim_slot(p_slot text, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare s text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select slot into s from members where user_id = auth.uid();
  if s is not null then return s; end if;
  if p_slot not in ('A','B') then raise exception 'Unknown place'; end if;
  insert into members (slot, user_id, name) values (p_slot, auth.uid(), left(coalesce(p_name, ''), 40))
    on conflict do nothing;
  select slot into s from members where user_id = auth.uid();
  if s is null then raise exception 'That place is already taken'; end if;
  return s;
end $$;

create or replace function public.send_card(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me text := my_slot(); c cards; partner text; nid uuid;
begin
  if me is null then raise exception 'Not a member'; end if;
  select * into c from cards where id = p_id for update;
  if not found or c.creator <> me or c.sent_at is not null then raise exception 'This card can''t be sent'; end if;
  if c.expiry is not null and c.expiry < current_date then raise exception 'Its expiry date has passed'; end if;
  partner := case me when 'A' then 'B' else 'A' end;
  update cards set recipient = partner, sent_at = now(),
         seen = jsonb_build_object(me, true, partner, false),
         log  = log || jsonb_build_array(jsonb_build_object('type','sent','by',me,'at',now_ms()))
   where id = p_id;
  insert into notifs (to_slot, type, card_id, text)
    values (partner, 'received', p_id, slot_name(me) || ' sent you a card: “' || c.title || '”')
    returning id into nid;
  return nid;
end $$;

create or replace function public.ask_card(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me text := my_slot(); c cards; nid uuid;
begin
  select * into c from cards where id = p_id for update;
  if not found or me is null or c.recipient is distinct from me then raise exception 'Not your card'; end if;
  if c.uses_redeemed >= c.lim then raise exception 'This card is used up'; end if;
  if c.expiry is not null and c.expiry < current_date then raise exception 'This card has expired'; end if;
  if c.ask_pending then raise exception 'You already asked'; end if;
  update cards set ask_pending = true,
         log = log || jsonb_build_array(jsonb_build_object('type','asked','by',me,'at',now_ms()))
   where id = p_id;
  insert into notifs (to_slot, type, card_id, text)
    values (c.creator, 'asked', p_id, slot_name(me) || ' is asking for “' || c.title || '”')
    returning id into nid;
  return nid;
end $$;

create or replace function public.redeem_card(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me text := my_slot(); c cards; remaining int; nid uuid;
begin
  select * into c from cards where id = p_id for update;
  if not found or me is null or c.creator <> me or c.sent_at is null then raise exception 'Only the giver can redeem'; end if;
  if c.uses_redeemed >= c.lim then raise exception 'This card is used up'; end if;
  if c.expiry is not null and c.expiry < current_date then raise exception 'This card has expired'; end if;
  remaining := c.lim - c.uses_redeemed - 1;
  update cards set uses_redeemed = uses_redeemed + 1, ask_pending = false,
         log = log || jsonb_build_array(jsonb_build_object('type','redeemed','by',me,'at',now_ms(),'left',remaining))
   where id = p_id;
  insert into notifs (to_slot, type, card_id, text)
    values (c.recipient, 'redeemed', p_id,
            slot_name(me) || ' redeemed “' || c.title || '” · ' || remaining || ' of ' || c.lim || ' left')
    returning id into nid;
  return nid;
end $$;

create or replace function public.mark_seen(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me text := my_slot();
begin
  update cards set seen = seen || jsonb_build_object(me, true)
   where id = p_id and recipient = me and me is not null;
end $$;

create or replace function public.mark_read(p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare me text := my_slot();
begin
  update notifs set read = true where id = any(p_ids) and to_slot = me and me is not null;
end $$;

revoke all on function public.claim_slot(text, text), public.send_card(uuid), public.ask_card(uuid),
  public.redeem_card(uuid), public.mark_seen(uuid), public.mark_read(uuid[]) from public, anon;
grant execute on function public.claim_slot(text, text), public.send_card(uuid), public.ask_card(uuid),
  public.redeem_card(uuid), public.mark_seen(uuid), public.mark_read(uuid[]) to authenticated;

-- Live updates ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['members','cards','notifs'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
