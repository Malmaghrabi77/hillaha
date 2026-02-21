import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

export function getSupabase() {
  if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) return null;
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}
