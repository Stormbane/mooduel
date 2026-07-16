/**
 * Signed anonymous session tokens (server-only).
 *
 * Stateless HMAC tokens: `v1.<id>.<exp>.<sig>`. The id is random, exp is
 * unix seconds, sig is HMAC-SHA256 over `v1.<id>.<exp>`. Clients hold the
 * token in an httpOnly cookie; game API routes verify it before calling
 * the service-role RPCs, so the database only ever sees session ids that
 * this server minted (see plan §2a — the RPCs are not exposed to clients).
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TTL_SECONDS = 7 * 24 * 60 * 60;
export const SESSION_COOKIE = "mooduel_session";

function secret(): string {
  const s = process.env.SESSION_TOKEN_SECRET;
  if (!s) throw new Error("SESSION_TOKEN_SECRET not configured");
  return s;
}

const sign = (payload: string) =>
  createHmac("sha256", secret()).update(payload).digest("base64url");

export function mintSessionToken(): { token: string; sessionId: string; maxAge: number } {
  const id = randomBytes(12).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `v1.${id}.${exp}`;
  return { token: `${payload}.${sign(payload)}`, sessionId: id, maxAge: TTL_SECONDS };
}

/** Returns the session id, or null for missing/garbled/forged/expired tokens. */
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [v, id, expStr, sig] = parts;
  const expected = sign(`${v}.${id}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expStr) < Date.now() / 1000) return null;
  return id;
}
