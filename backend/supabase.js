const { createClient } = require("@supabase/supabase-js");

const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const url = process.env.SUPABASE_URL;
const authOptions = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };

// Used only to validate Supabase Auth credentials and access tokens.
const authClient = createClient(url, process.env.SUPABASE_ANON_KEY, authOptions);

// This privileged client must remain on the server. Every data route also applies
// ownership/role checks before querying user data.
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, authOptions);

module.exports = { authClient, db };
