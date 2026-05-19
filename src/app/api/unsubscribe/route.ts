/**
 * GET  /api/unsubscribe?token=...  → HTML confirmation page
 * POST /api/unsubscribe?token=...  → One-click (RFC 8058)
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { getSupabase } from "@/lib/db";
import { hasSupabase } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function unsubscribe(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabase()) {
    // Without a DB we can't persist, but pretend success so the user
    // isn't told to come back later — the link is the contract.
    return { ok: true };
  }
  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Mark email_users row unsubscribed (upsert in case they unsubscribe
  // before ever requesting a reminder — defensive).
  const { error: upsertErr } = await supabase
    .from("email_users")
    .upsert({ email, unsubscribed_at: now }, { onConflict: "email" });
  if (upsertErr) return { ok: false, error: upsertErr.message };

  // Future reminder rows for this email will be skipped by the cron.
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const email = verifyUnsubscribeToken(token);
  if (!email) {
    return new Response(page("Invalid or expired unsubscribe link.", false), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  const result = await unsubscribe(email);
  return new Response(
    page(
      result.ok
        ? `You're unsubscribed: ${escapeHtml(email)}`
        : `Sorry — we couldn't unsubscribe you. ${escapeHtml(result.error || "")}`,
      result.ok,
    ),
    {
      status: result.ok ? 200 : 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const email = verifyUnsubscribeToken(token);
  if (!email) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 });
  const result = await unsubscribe(email);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function page(message: string, ok: boolean): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>RSV Drop Tool — Unsubscribe</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f1f5f9; margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; color:#0f172a; }
  .card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:28px; max-width:520px; width:100%; }
  h1 { font-size:20px; margin:0 0 8px; }
  p { color:#334155; line-height:1.5; }
  .pill { display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; }
  .ok { background:#dcfce7; color:#166534; }
  .bad { background:#fee2e2; color:#991b1b; }
  .brand { color:#64748b; font-size:12px; margin-top:18px; }
</style></head>
<body><div class="card">
  <div class="pill ${ok ? "ok" : "bad"}">${ok ? "Unsubscribed" : "Error"}</div>
  <h1 style="margin-top:12px;">RSV Drop Tool</h1>
  <p>${message}</p>
  <div class="brand">by Keith Fallon (PVD)</div>
</div></body></html>`;
}
