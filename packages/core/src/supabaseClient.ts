import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) return null;
  if (!_client) {
    _client = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _client;
}

export function resetSupabaseClient() {
  _client = null;
}
