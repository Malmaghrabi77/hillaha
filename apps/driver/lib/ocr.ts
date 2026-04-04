import * as FileSystem from "expo-file-system";

const VISION_API = "https://vision.googleapis.com/v1/images:annotate";

/**
 * Send a local image URI to Google Cloud Vision TEXT_DETECTION and return raw text.
 * Falls back gracefully — returns empty string on any failure.
 */
export async function extractTextFromImage(imageUri: string): Promise<string> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      // No API key configured
      return "";
    }

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch(`${VISION_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    });

    const json = await response.json();
    const annotations = json?.responses?.[0]?.textAnnotations;
    if (!annotations || annotations.length === 0) return "";
    return annotations[0]?.description ?? "";
  } catch (err) {
    return "";
  }
}


/**
 * Try to extract an expiry date from OCR text.
 * Looks for date patterns and returns the latest date found (likely the expiry).
 */
export function extractExpiryDate(ocrText: string): Date | null {
  if (!ocrText) return null;

  const dates: Date[] = [];

  // DD/MM/YYYY or DD-MM-YYYY
  const pattern1 = /(\d{1,2})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(20\d{2})/g;
  let match;
  while ((match = pattern1.exec(ocrText)) !== null) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const y = parseInt(match[3], 10);
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
      dates.push(new Date(y, m, d));
    }
  }

  // YYYY/MM/DD
  const pattern2 = /(20\d{2})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{1,2})/g;
  while ((match = pattern2.exec(ocrText)) !== null) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
      dates.push(new Date(y, m, d));
    }
  }

  if (dates.length === 0) return null;

  // Return the latest date (most likely the expiry)
  dates.sort((a, b) => b.getTime() - a.getTime());
  return dates[0];
}

/**
 * Check if a document expiry date is still valid (in the future).
 */
export function isDocumentValid(expiryDate: Date): boolean {
  return expiryDate.getTime() > Date.now();
}

/**
 * Format a date to DD/MM/YYYY for display.
 */
export function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}
