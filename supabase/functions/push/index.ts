// Favor Cards: sends a push notification to the partner's phones.
// Supabase > Edge Functions > Deploy a new function > Via Editor, name it "push",
// paste this file, and deploy. Secrets it needs: VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// are provided automatically).
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const TITLES: Record<string, string> = {
  received: "New favor card 💌",
  asked: "Favor requested 🙋",
  redeemed: "Favor redeemed ✅",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const { notif_id } = await req.json();
    const { data: me } = await admin.from("members").select("slot").eq("user_id", user.id).maybeSingle();
    if (!me) return json({ error: "not a member" }, 403);

    const { data: n } = await admin.from("notifs").select("*").eq("id", notif_id).maybeSingle();
    // Only the partner who caused the notification may trigger its push, and only once.
    if (!n || n.to_slot === me.slot) return json({ error: "bad notification" }, 400);
    const { data: claimed } = await admin.from("notifs").update({ pushed: true })
      .eq("id", n.id).eq("pushed", false).select("id");
    if (!claimed?.length) return json({ ok: true, sent: 0 });

    const { data: subs } = await admin.from("push_subs").select("endpoint, subscription").eq("slot", n.to_slot);
    const payload = JSON.stringify({
      title: TITLES[n.type] ?? "Favor Cards",
      body: n.text,
      tag: n.id,
      url: "./#notif-" + n.id,
    });
    let sent = 0;
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, payload, { TTL: 86400 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from("push_subs").delete().eq("endpoint", s.endpoint);
      }
    }));
    return json({ ok: true, sent });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
