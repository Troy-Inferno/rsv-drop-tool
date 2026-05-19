/**
 * Generates and verifies HMAC-signed unsubscribe tokens, so an
 * unsubscribe link in an email can't be forged for a different address.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "./env";

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string): string {
  const secret = env.unsubscribeSecret();
  return base64url(createHmac("sha256", secret).update(payload).digest());
}

export function makeUnsubscribeToken(email: string): string {
  const payload = base64url(email.toLowerCase().trim());
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    return Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(email: string): string {
  const token = makeUnsubscribeToken(email);
  return `${env.siteUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}
