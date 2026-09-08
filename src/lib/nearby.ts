export type UserLocation = { lat: number; lng: number; accuracy: number };
export const nearbyRadiusMeters = 5 * 1609.344;
export function distanceMeters(from: {lat: number; lng: number}, to: {lat: number; lng: number}): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat = radians(to.lat - from.lat), lng = radians(to.lng - from.lng);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lng / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
}
export function distanceLabel(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 160.9344) return `${Math.max(10, Math.round(meters / 0.3048 / 10) * 10)} ft`;
  return `${(meters / 1609.344).toFixed(meters < 16093.44 ? 1 : 0)} mi`;
}
