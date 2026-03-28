import { Alert } from "react-native";

export async function uploadToStorage(
  supabase: any,
  bucket: string,
  filePath: string,
  localUri: string,
  contentType = "image/jpeg"
): Promise<string> {
  const fetchRes = await fetch(localUri);
  const blob = await fetchRes.blob();
  const arrayBuf = await blob.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, arrayBuf, { contentType, upsert: true });

  if (error) throw error;

  if (bucket === "avatars") {
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return publicUrl;
  }

  // Private bucket → return the path (admin uses signed URLs)
  return filePath;
}

export async function uploadDriverDocuments(
  supabase: any,
  userId: string,
  docs: {
    identityPhotoUri: string;
    licensePhotoUri?: string | null;
    vehiclePhotoUri?: string | null;
    selfieUri: string;
  }
): Promise<{
  identityPhotoUrl: string;
  licensePhotoUrl: string | null;
  vehiclePhotoUrl: string | null;
  selfieUrl: string;
}> {
  const identityPhotoUrl = await uploadToStorage(
    supabase,
    "driver-documents",
    `${userId}/identity.jpg`,
    docs.identityPhotoUri
  );

  let licensePhotoUrl: string | null = null;
  if (docs.licensePhotoUri) {
    licensePhotoUrl = await uploadToStorage(
      supabase,
      "driver-documents",
      `${userId}/license.jpg`,
      docs.licensePhotoUri
    );
  }

  let vehiclePhotoUrl: string | null = null;
  if (docs.vehiclePhotoUri) {
    vehiclePhotoUrl = await uploadToStorage(
      supabase,
      "driver-documents",
      `${userId}/vehicle.jpg`,
      docs.vehiclePhotoUri
    );
  }

  const selfieUrl = await uploadToStorage(
    supabase,
    "avatars",
    `drivers/${userId}.jpg`,
    docs.selfieUri
  );

  return { identityPhotoUrl, licensePhotoUrl, vehiclePhotoUrl, selfieUrl };
}
