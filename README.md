# Favor Cards

A private web app for two people to make and redeem favor cards. You can install it on your home screen, and it sends push notifications.

- **App:** static files served by GitHub Pages (`index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`, `vendor/`).
- **Backend:** Supabase (free tier). It handles sign-in, the database, live sync and the `push` edge function that sends notifications.

Everything below can be done from a phone browser. Allow about 20 minutes.

---

## 1. Create the Supabase project
1. Go to supabase.com and create a free account and a **New project**. Pick a region near you and save the database password somewhere safe.
2. When it's ready, open **SQL Editor → New query**. Paste the whole of `supabase/schema.sql`, then tap **Run**. You should see "Success. No rows returned".

## 2. Create your two accounts and lock sign-ups
1. **Authentication → Users → Add user → Create new user.** Enter your email and a password, and tick **Auto Confirm User**.
2. Do the same for your partner. You can set a temporary password and they can change it later from Supabase.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". After this, nobody else can make an account.

## 3. Add the push function
1. **Edge Functions → Deploy a new function → Via Editor.** Name it exactly `push`.
2. Replace the starter code with the contents of `supabase/functions/push/index.ts`, then **Deploy**.
3. **Edge Functions → Secrets** (or Project Settings → Edge Functions): add three secrets.
   - `VAPID_PUBLIC_KEY`: the same value as `VAPID_PUBLIC_KEY` in `config.js`
   - `VAPID_PRIVATE_KEY`: the private key you were given separately (never put it in this repo)
   - `VAPID_SUBJECT`: `mailto:` followed by your email, e.g. `mailto:you@example.com`

## 4. Connect the app to Supabase
1. **Project Settings → API**: copy the **Project URL** and the **anon** (or **publishable**) key.
2. In this repo, edit `config.js` and paste them into `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Change `PARTNER_A` and `PARTNER_B` to your names if you like. These values are safe to be public, because the database rules decide who can see anything.
3. Commit the change.

## 5. Turn on GitHub Pages
**Repo → Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save.**
After a minute the app is live at `https://<your-username>.github.io/<repo-name>/`.

## 6. Install it on each phone
- **iPhone (iOS 16.4 or later):** open the link in **Safari**, then tap Share → **Add to Home Screen**. Open Favor Cards from the new icon, sign in, then tap **Turn on notifications** on the Home screen. On iPhone, notifications only work from the home-screen app.
- **Android:** open the link in **Chrome**, then tap ⋮ → **Install app** (or "Add to Home screen"). Open it, sign in, and tap **Turn on notifications**.

The first time each of you signs in, you choose **I'm Partner A** or **I'm Partner B**. That choice is saved to your account for good.

---

## Good to know
- **Who gets notified:** the partner gets a push when a card is sent to them, and when a favor is redeemed. The giver gets a push when the partner taps Ask.
- **Changing names later:** edit `config.js`. The names inside notification text come from when each person first joined.
- **Starting over:** in Supabase SQL Editor, run `truncate public.cards, public.notifs cascade;` to clear all cards and notifications. To reset who is A and who is B, run `delete from public.members;`.
- **App not updating on a phone:** close it fully and reopen it. It always loads the newest files when it's online.
