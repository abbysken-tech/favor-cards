// Favor Cards settings. Fill in the two Supabase values from
// Supabase > Project Settings > API (Project URL and the anon / publishable key).
// These are safe to publish: the database rules decide who can see anything.
window.FAVOR_CONFIG = {
  SUPABASE_URL: "https://xrsxifyximefmxdkddwp.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_kdhZDTwmJdQPA6PSiAsOnA_htkmzD0U",
  // Public half of the push key pair. Its private half goes in Supabase Edge Function secrets.
  VAPID_PUBLIC_KEY: "BKOBN1Ifv2cUxue3d0Cng8xYHwh8eMcG2-HJdhBBfZf28dOyBkWXglUwZ9zi9ax7JPBI33eQ6JcEFstkho-wITE",
  // Display names
  PARTNER_A: "Ken",
  PARTNER_B: "Princess"
};
