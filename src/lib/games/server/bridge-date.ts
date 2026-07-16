/**
 * Daily puzzles follow the player's local midnight, so the client sends
 * its own date string. Accept it only within ±1 day of server UTC — wide
 * enough for every timezone, narrow enough that nobody farms the archive.
 */
export function clampBridgeDate(requested: string | null): string {
  const utcToday = new Date().toISOString().slice(0, 10);
  if (!requested || !/^\d{4}-\d{2}-\d{2}$/.test(requested)) return utcToday;
  const delta = Math.abs(Date.parse(`${requested}T00:00:00Z`) - Date.parse(`${utcToday}T00:00:00Z`));
  return delta <= 86_400_000 ? requested : utcToday;
}
