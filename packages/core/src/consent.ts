import type { ConsentType, CountryCode, UserRole } from "./types";
export const CURRENT_AGREEMENT_VERSION = "1.0.0";

export type ConsentRecord = {
  userId: string;
  consentType: ConsentType;
  version: string;
  acceptedAt: string;
  country: CountryCode;
  role: UserRole;
};

export function makeConsentRecord(input: Omit<ConsentRecord, "version" | "acceptedAt">): ConsentRecord {
  return { ...input, version: CURRENT_AGREEMENT_VERSION, acceptedAt: new Date().toISOString() };
}
