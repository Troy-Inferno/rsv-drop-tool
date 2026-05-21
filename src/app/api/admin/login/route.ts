/**
 * POST /api/admin/login
 *
 * Accepts form-encoded `password=...`. If it matches ADMIN_EXPORT_TOKEN,
 * sets a signed HttpOnly cookie and redirects to /admin. Otherwise
 * redirects back to /admin/login?error=1.
 *
 * Uses constant-time compare to defeat timing side channels.
 */

import { type NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { env } from "@/lib/env";
import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  buildAdminCookieValue,
} from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const submitted = form.get("password");
  const expected = env.adminExportToken();

  if (typeof submitted !== "string" || !constantTimeEquals(submitted, expected)) {
    return NextResponse.redirect(new URL("/admin/login?error=1", req.url), {
      status: 303,
    });
  }

  const res = NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE_NAME, buildAdminCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
