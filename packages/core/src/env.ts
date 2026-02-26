export const ENV = {
  DEMO_MODE: String(process.env.EXPO_PUBLIC_DEMO_MODE ?? process.env.NEXT_PUBLIC_DEMO_MODE ?? "true").toLowerCase() === "true",
  SUPABASE_URL: String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ynduborjddqwyperlkrq.supabase.co"),
  SUPABASE_ANON_KEY: String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_UkEr17IyjCEscr16OnCVDg_iQsNxzHk"),
} as const;
