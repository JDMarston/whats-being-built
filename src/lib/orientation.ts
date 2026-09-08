export type CompassReading = {
  alpha: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};
export function normalizeDegrees(degrees: number): number { return ((degrees % 360) + 360) % 360; }
export function headingFromReading(event: CompassReading, screenAngle = 0): number | null {
  if (Number.isFinite(event.webkitCompassHeading)) {
    const accuracy = event.webkitCompassAccuracy;
    if (typeof accuracy === 'number' && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 30)) return null;
    return normalizeDegrees(event.webkitCompassHeading! + screenAngle);
  }
  // Relative alpha has no north reference. Never present it as a compass.
  if (!event.absolute || event.alpha === null || !Number.isFinite(event.alpha)) return null;
  return normalizeDegrees(360 - event.alpha + screenAngle);
}
export function smoothHeading(previous: number | null, next: number): number {
  if (previous === null) return normalizeDegrees(next);
  const delta = ((next - previous + 540) % 360) - 180;
  return normalizeDegrees(previous + delta * 0.25);
}
