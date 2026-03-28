import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const C = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  pink: "#EC4899",
  pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  success: "#34D399",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
  deepPurple: "#6D28D9",
} as const;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://ynduborjddqwyperlkrq.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_UkEr17IyjCEscr16OnCVDg_iQsNxzHk";

let _sb: ReturnType<typeof createClient> | null = null;

export function getSB() {
  if (!_sb) {
    _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _sb;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const VEHICLE_LABELS: Record<string, string> = {
  car: "سيارة",
  scooter: "سكوتر / فيسبا",
  bicycle: "دراجة هوائية",
};

export const IDENTITY_LABELS: Record<string, string> = {
  national_id: "بطاقة رقم قومي",
  passport: "جواز سفر",
};

export const MAX_BICYCLE_DISTANCE_KM = 2;
