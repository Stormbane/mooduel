/**
 * Shared service-role Supabase client for game API routes (server-only).
 * Bypasses RLS — every route using this must validate the session token
 * and request shape first; the RPCs it calls enforce the rest.
 */
import { createClient } from "@supabase/supabase-js";

export const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/** Resolve an authenticated user from a Bearer token, if present. */
export async function getUserId(authHeader: string | null): Promise<string | null> {
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await anon.auth.getUser(token);
  return data.user?.id ?? null;
}

/** sha256 of the connecting IP — the trusted ip_hash the caps key on. */
import { createHash } from "crypto";
export function ipHash(req: Request): string {
  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
