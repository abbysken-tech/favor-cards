// Favor Cards settings. Fill in the two Supabase values from
// Supabase > Project Settings > API (Project URL and the anon / publishable key).
// These are safe to publish: the database rules decide who can see anything.
window.FAVOR_CONFIG = {
  SUPABASE_URL: "PASTE_PROJECT_URL_HERE",
  SUPABASE_ANON_KEY: "PASTE_ANON_OR_PUBLISHABLE_KEY_HERE",
  // Public half of the push key pair. Its private half goes in Supabase Edge Function secrets.
  VAPID_PUBLIC_KEY: "BKOBN1Ifv2cUxue3d0Cng8xYHwh8eMcG2-HJdhBBfZf28dOyBkWXglUwZ9zi9ax7JPBI33eQ6JcEFstkho-wITE",
  // Display names
  PARTNER_A: "Partner A",
  PARTNER_B: "Partner B"
};
