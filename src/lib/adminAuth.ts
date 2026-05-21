/**
 * Admin session auth.
 *
 * One-password login (the `ADMIN_EXPORT_TOKEN` env var doubles as the
 * admin password). On successful login we set a signed, HttpOnly cookie
 * that expires after 14 days. Server components and API routes can
 * call `checkAdminAuth()` to gate access.
 *
 * Cookie format: `v1:<issuedAt>:<hmacSha256>`
 *   - issuedAt: unix seconds when the cookie was minted
 *   - hmac: HMAC-SHA256(env.adminExportToken, "v1:<issuedAt>")
 *
 * Tampering with `issuedAt` breaks the signature; expired cookies are
 * rejected even if signed correctly. The secret used to sign is the
 * admin token itself, so rotating the env var instantly invalidates
 * every outstanding session.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "./env";

export const ADMIN_COOKIE_NAME = "rsv_admin";
/** Session lifetime: 14 days. */
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 14;

function sign(payload: string): string {
  return createHmac("sha256", env.adminExportToken()).update(payload).digest("hex");
}

export function buildAdminCookieValue(): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `v1:${issuedAt}`;
  return `${payload}:${sign(payload)}`;
}

export function isValidAdminCookie(value: string | undefined | null): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  const [version, issuedStr, sig] = parts;
  if (version !== "v1") return false;
  const issuedAt = Number.parseInt(issuedStr, 10);
  if (!Number.isFinite(issuedAt)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now - issuedAt > ADMIN_COOKIE_MAX_AGE) return false; // expired
  if (now < issuedAt - 60) return false; // issued in the future = forged
  const expected = sign(`v1:${issuedStr}`);
  let a: Buffer, b: Buffer;
  try {
    a = Buffer.from(sig, "hex");
    b = Buffer.from(expected, "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Returns true if the current request carries a valid admin session cookie. */
export async function checkAdminAuth(): Promise<boolean> {
  const store = await cookies();
  return isValidAdminCookie(store.get(ADMIN_COOKIE_NAME)?.value);
}
