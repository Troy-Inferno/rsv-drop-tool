/**
 * Per-IP rate limiting for the public signup endpoint.
 *
 * Strategy: stateless serverless functions on Vercel can't share an
 * in-memory counter, so we persist one row per attempt in Supabase
 * (`rate_limits` table). On each request, count rows for the same IP
 * within the throttle window. If under the cap, insert and allow.
 *
 * The check + insert is two queries (not atomic), so under extreme
 * concurrency you could squeeze one extra request through. For a form
 * with ~3 humans per hour limits, that's fine.
 */

import "server-only";
import type { NextRequest } from "next/server";
import { getSupabase } from "./db";

/** Window length for the rate limit check, in minutes. */
export const WINDOW_MINUTES = 60;

/** Maximum attempts per IP within the window. */
export const MAX_ATTEMPTS = 3;

/**
 * Best-effort extraction of the client IP from a Vercel-fronted request.
 * Vercel sets `x-forwarded-for` (comma-separated chain; the leftmost
 * entry is the real client) and `x-real-ip` (single value).
 * Falls back to "unknown" if neither is present — that bucket then
 * becomes its own rate-limit cohort, which is the safe default.
 */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  /** Number of attempts already in the window (before this one was counted). */
  used: number;
  /** Total cap within the window. */
  limit: number;
  /** ISO timestamp when the oldest counted attempt rolls off. */
  resetAt?: string;
  /** Optional human-readable error to surface to the client. */
  error?: string;
}

/**
 * Check + record one attempt for the given IP.
 *
 * Returns `{ allowed: true }` if the IP is under the cap; the call also
 * inserts a row to count this attempt.
 *
 * Returns `{ allowed: false, error, resetAt, used, limit }` if over the
 * cap; nothing is inserted.
 */
export async function checkAndRecord(ip: string): Promise<RateLimitResult> {
  const supabase = getSupabase();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  // Count attempts within the window.
  const { data: rows, error: selErr } = await supabase
    .from("rate_limits")
    .select("attempted_at")
    .eq("ip", ip)
    .gte("attempted_at", windowStart)
    .order("attempted_at", { ascending: true });

  if (selErr) {
    // Fail-open: a transient DB error shouldn't lock people out of the
    // form. Log on the server, allow the request through.
    console.error("rate_limits select error:", selErr.message);
    return { allowed: true, used: 0, limit: MAX_ATTEMPTS };
  }

  const used = rows?.length ?? 0;

  if (used >= MAX_ATTEMPTS) {
    const resetAt = rows && rows[0]
      ? new Date(new Date(rows[0].attempted_at).getTime() + WINDOW_MINUTES * 60_000).toISOString()
      : new Date(Date.now() + WINDOW_MINUTES * 60_000).toISOString();
    return {
      allowed: false,
      used,
      limit: MAX_ATTEMPTS,
      resetAt,
      error: `Too many requests from this network. You can submit up to ${MAX_ATTEMPTS} reminders per hour. Try again after ${new Date(resetAt).toLocaleTimeString()}.`,
    };
  }

  // Record this attempt. Non-fatal if it fails.
  const { error: insErr } = await supabase
    .from("rate_limits")
    .insert({ ip, attempted_at: new Date().toISOString() });
  if (insErr) {
    console.error("rate_limits insert error:", insErr.message);
  }

  return { allowed: true, used: used + 1, limit: MAX_ATTEMPTS };
}
