/**
 * International dialing codes with flags — Arab countries only.
 * Sorted: priority countries first (EG, SA, SD), then alphabetical by Arabic name.
 * Auto-detect uses device locale region code.
 */

export interface CountryCode {
  iso: string;      // ISO 3166-1 alpha-2
  code: string;     // dialing code with +
  flag: string;     // emoji flag
  nameAr: string;   // Arabic name
  nameEn: string;   // English name (for search)
}

// Priority countries shown at top
const PRIORITY: CountryCode[] = [
  { iso: "EG", code: "+20",  flag: "\u{1F1EA}\u{1F1EC}", nameAr: "مصر",        nameEn: "Egypt" },
  { iso: "SA", code: "+966", flag: "\u{1F1F8}\u{1F1E6}", nameAr: "السعودية",   nameEn: "Saudi Arabia" },
  { iso: "SD", code: "+249", flag: "\u{1F1F8}\u{1F1E9}", nameAr: "السودان",     nameEn: "Sudan" },
];

const ARAB_COUNTRIES: CountryCode[] = [
  { iso: "AE", code: "+971", flag: "\u{1F1E6}\u{1F1EA}", nameAr: "الإمارات",       nameEn: "UAE" },
  { iso: "BH", code: "+973", flag: "\u{1F1E7}\u{1F1ED}", nameAr: "البحرين",        nameEn: "Bahrain" },
  { iso: "DZ", code: "+213", flag: "\u{1F1E9}\u{1F1FF}", nameAr: "الجزائر",        nameEn: "Algeria" },
  { iso: "DJ", code: "+253", flag: "\u{1F1E9}\u{1F1EF}", nameAr: "جيبوتي",         nameEn: "Djibouti" },
  { iso: "IQ", code: "+964", flag: "\u{1F1EE}\u{1F1F6}", nameAr: "العراق",         nameEn: "Iraq" },
  { iso: "JO", code: "+962", flag: "\u{1F1EF}\u{1F1F4}", nameAr: "الأردن",         nameEn: "Jordan" },
  { iso: "KW", code: "+965", flag: "\u{1F1F0}\u{1F1FC}", nameAr: "الكويت",         nameEn: "Kuwait" },
  { iso: "LB", code: "+961", flag: "\u{1F1F1}\u{1F1E7}", nameAr: "لبنان",          nameEn: "Lebanon" },
  { iso: "LY", code: "+218", flag: "\u{1F1F1}\u{1F1FE}", nameAr: "ليبيا",          nameEn: "Libya" },
  { iso: "MA", code: "+212", flag: "\u{1F1F2}\u{1F1E6}", nameAr: "المغرب",         nameEn: "Morocco" },
  { iso: "MR", code: "+222", flag: "\u{1F1F2}\u{1F1F7}", nameAr: "موريتانيا",      nameEn: "Mauritania" },
  { iso: "OM", code: "+968", flag: "\u{1F1F4}\u{1F1F2}", nameAr: "عُمان",          nameEn: "Oman" },
  { iso: "PS", code: "+970", flag: "\u{1F1F5}\u{1F1F8}", nameAr: "فلسطين",         nameEn: "Palestine" },
  { iso: "QA", code: "+974", flag: "\u{1F1F6}\u{1F1E6}", nameAr: "قطر",            nameEn: "Qatar" },
  { iso: "SO", code: "+252", flag: "\u{1F1F8}\u{1F1F4}", nameAr: "الصومال",        nameEn: "Somalia" },
  { iso: "SY", code: "+963", flag: "\u{1F1F8}\u{1F1FE}", nameAr: "سوريا",          nameEn: "Syria" },
  { iso: "TN", code: "+216", flag: "\u{1F1F9}\u{1F1F3}", nameAr: "تونس",           nameEn: "Tunisia" },
  { iso: "YE", code: "+967", flag: "\u{1F1FE}\u{1F1EA}", nameAr: "اليمن",          nameEn: "Yemen" },
  { iso: "KM", code: "+269", flag: "\u{1F1F0}\u{1F1F2}", nameAr: "جزر القمر",      nameEn: "Comoros" },
];

/** Full list: priority countries first (EG, SA, SD), then remaining Arab countries */
export const COUNTRIES: CountryCode[] = [
  ...PRIORITY,
  ...ARAB_COUNTRIES,
];

/** Default index (Egypt) */
export const DEFAULT_COUNTRY_INDEX = 0;

/**
 * Detect best country index from device locale.
 * Uses Intl.DateTimeFormat to get region without extra packages.
 */
export function detectCountryIndex(): number {
  try {
    // Try to get region from Intl API (works on modern RN / Hermes)
    const locale =
      (typeof navigator !== "undefined" && (navigator as any).language) ||
      Intl.DateTimeFormat().resolvedOptions().locale ||
      "";
    // Locale can be "ar-EG", "en-SA", "ar-SD", etc.
    const region = locale.split("-").pop()?.toUpperCase() ?? "";
    if (region.length === 2) {
      const idx = COUNTRIES.findIndex(c => c.iso === region);
      if (idx >= 0) return idx;
    }
  } catch {
    // Intl not available
  }
  return DEFAULT_COUNTRY_INDEX; // Egypt
}

/** Search countries by name (Arabic or English) or dial code */
export function searchCountries(query: string): CountryCode[] {
  if (!query.trim()) return COUNTRIES;
  const q = query.trim().toLowerCase();
  return COUNTRIES.filter(
    c =>
      c.nameAr.includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.code.includes(q) ||
      c.iso.toLowerCase() === q,
  );
}
