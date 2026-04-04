export const ENV = {
  DEMO_MODE: String(process.env.EXPO_PUBLIC_DEMO_MODE ?? process.env.NEXT_PUBLIC_DEMO_MODE ?? "true").toLowerCase() === "true",
  SUPABASE_URL: String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
  SUPABASE_ANON_KEY: String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""),
} as const;
