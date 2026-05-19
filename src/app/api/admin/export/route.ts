/**
 * GET /api/admin/export?token=...
 *
 * Returns a CSV export of reminder_requests + email_users for the admin.
 * Auth: `?token=$ADMIN_EXPORT_TOKEN` or `Authorization: Bearer $ADMIN_EXPORT_TOKEN`.
 */

import { type NextRequest, NextResponse } from "next/server";
import { env, hasSupabase } from "@/lib/env";
import { getSupabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  let expected: string;
  try {
    expected = env.adminExportToken();
  } catch {
    return false;
  }
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("token") === expected) return true;
  return false;
}

const REMINDER_COLS = [
  "id",
  "email",
  "rsv_date",
  "timezone",
  "open_time_utc",
  "close_time_utc",
  "noc_check_time_utc",
  "remind_open",
  "remind_close",
  "remind_noc",
  "open_reminder_sent_at",
  "close_reminder_sent_at",
  "noc_reminder_sent_at",
  "created_at",
];

const EMAIL_USER_COLS = [
  "id",
  "email",
  "first_seen_at",
  "last_seen_at",
  "source",
  "unsubscribed_at",
];

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: Record<string, unknown>[], cols: string[]): string {
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => csvCell(r[c])).join(","));
  return [head, ...body].join("\n");
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabase()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  const supabase = getSupabase();
  const which = new URL(req.url).searchParams.get("table") || "reminder_requests";

  if (which === "email_users") {
    const { data, error } = await supabase.from("email_users").select(EMAIL_USER_COLS.join(","));
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const csv = rowsToCsv((data || []) as unknown as Record<string, unknown>[], EMAIL_USER_COLS);
    return csvResponse(csv, "email_users");
  }

  const { data, error } = await supabase.from("reminder_requests").select(REMINDER_COLS.join(","));
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const csv = rowsToCsv((data || []) as unknown as Record<string, unknown>[], REMINDER_COLS);
  return csvResponse(csv, "reminder_requests");
}

function csvResponse(csv: string, name: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
