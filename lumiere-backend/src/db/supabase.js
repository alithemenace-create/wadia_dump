const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. ' +
    'Copy .env.example → .env and fill in your Supabase credentials.'
  );
}

/**
 * Service-role client — bypasses Row Level Security.
 * Only used server-side; never expose this key to the browser.
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
);

module.exports = supabase;
