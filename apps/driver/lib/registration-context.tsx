import React, { createContext, useContext, useState } from "react";

export type VehicleType = "car" | "scooter" | "bicycle" | null;
export type IdentityType = "national_id" | "passport" | null;

export interface RegistrationData {
  // Step 1
  fullName: string;
  phone: string;
  email: string;
  password: string;
  // Step 2
  vehicleType: VehicleType;
  // Step 3
  identityType: IdentityType;
  identityNumber: string;
  identityPhotoUri: string | null;
  // Step 4
  licenseNumber: string;
  licenseExpiryDate: string;
  licensePhotoUri: string | null;
  // Step 4 OCR
  ocrResult: string | null;
  // Step 5
  vehiclePlate: string;
  vehiclePhotoUri: string | null;
  // Step 6
  selfieUri: string | null;
}

const DEFAULT: RegistrationData = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  vehicleType: null,
  identityType: null,
  identityNumber: "",
  identityPhotoUri: null,
  licenseNumber: "",
  licenseExpiryDate: "",
  licensePhotoUri: null,
  ocrResult: null,
  vehiclePlate: "",
  vehiclePhotoUri: null,
  selfieUri: null,
};

interface CtxValue {
  data: RegistrationData;
  update: (patch: Partial<RegistrationData>) => void;
  reset: () => void;
}

const Ctx = createContext<CtxValue>({
  data: DEFAULT,
  update: () => {},
  reset: () => {},
});

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<RegistrationData>({ ...DEFAULT });

  const update = (patch: Partial<RegistrationData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const reset = () => setData({ ...DEFAULT });

  return <Ctx.Provider value={{ data, update, reset }}>{children}</Ctx.Provider>;
}

export function useRegistration() {
  return useContext(Ctx);
}
