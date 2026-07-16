/**
 * Mobile floor: every client fetch goes through here so a native shell
 * (Capacitor) can point the whole games layer at production by setting
 * NEXT_PUBLIC_API_BASE. Default is same-origin.
 */
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}
