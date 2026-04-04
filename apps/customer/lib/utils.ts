/**
 * Shared utility functions for the customer app.
 */

/**
 * Calculate the great-circle distance between two points on Earth
 * using the Haversine formula.
 *
 * @returns Distance in kilometres
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format a number (or numeric string) as Egyptian-pound currency with Arabic locale.
 *
 * @example formatCurrency(1250)    // "1,250 ج.م"
 * @example formatCurrency("19.5")  // "19.5 ج.م"
 * @example formatCurrency("abc")   // "0 ج.م"
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ج.م';
  return `${num.toLocaleString('ar-EG')} ج.م`;
}
