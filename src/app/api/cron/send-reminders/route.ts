/**
 * GET /api/cron/send-reminders
 *
 * Vercel Cron-compatible endpoint. Sends due reminder emails and marks
 * them as sent using sent_at timestamps to prevent duplicates.
 *
 * Auth: Vercel Cron sends an Authorization: Bearer $CRON_SECRET header.
 * We accept either that header, or `?secret=$CRON_SECRET` for manual runs.
 *
 * "Due" definitions:
 *   - open  reminders: open_time_utc  <= now AND open_reminder_sent_at  IS NULL
 *   - close reminders: close_time_utc - 1h <= now < close_time_utc AND close_reminder_sent_at IS NULL
 *   - noc   reminders: noc_check_time_utc <= now AND noc_reminder_sent_at IS NULL
 *
 * Also skips any reminder whose recipient has unsubscribed.
 */

import { NextResponse, type NextRequest } from "next/server";
import { DateTime } from "luxon";
import { getSupabase, type ReminderRequestRow } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";
import { env, hasSupabase, hasResend } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_LIMIT = 250;

function authorize(req: NextRequest): boolean {
  let expected: string;
  try {
    expected = env.cronSecret();
  } catch {
    return false;
  }
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === expected) return true;
  return false;
}

interface SendStats {
  ok: boolean;
  attempted: number;
  sent: number;
  skipped_unsubscribed: number;
  errors: { id: string; kind: string; error: string }[];
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabase()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }
  if (!hasResend()) {
    return NextResponse.json({ ok: false, error: "Resend not configured" }, { status: 500 });
  }

  const supabase = getSupabase();
  const nowIso = DateTime.utc().toISO()!;
  const closeWarnAfterIso = DateTime.utc().plus({ hours: 1 }).toISO()!;

  const stats: SendStats = {
    ok: true,
    attempted: 0,
    sent: 0,
    skipped_unsubscribed: 0,
    errors: [],
  };

  // --- Pull each due bucket separately to keep filters simple ---

  const due: {
    kind: "open" | "close" | "noc";
    rows: ReminderRequestRow[];
  }[] = [];

  // OPEN: open_time_utc <= now, not yet sent, remind_open true
  {
    const { data, error } = await supabase
      .from("reminder_requests")
      .select("*")
      .eq("remind_open", true)
      .is("open_reminder_sent_at", null)
      .lte("open_time_utc", nowIso)
      .limit(BATCH_LIMIT);
    if (error) return errorResponse(error.message);
    due.push({ kind: "open", rows: (data || []) as ReminderRequestRow[] });
  }

  // CLOSE: close_time_utc - 1h <= now AND now < close_time_utc
  {
    const { data, error } = await supabase
      .from("reminder_requests")
      .select("*")
      .eq("remind_close", true)
      .is("close_reminder_sent_at", null)
      .lte("close_time_utc", closeWarnAfterIso) // close within next 1h
      .gt("close_time_utc", nowIso)             // and not yet past
      .limit(BATCH_LIMIT);
    if (error) return errorResponse(error.message);
    due.push({ kind: "close", rows: (data || []) as ReminderRequestRow[] });
  }

  // NOC: noc_check_time_utc <= now, not yet sent, remind_noc true
  {
    const { data, error } = await supabase
      .from("reminder_requests")
      .select("*")
      .eq("remind_noc", true)
      .is("noc_reminder_sent_at", null)
      .lte("noc_check_time_utc", nowIso)
      .limit(BATCH_LIMIT);
    if (error) return errorResponse(error.message);
    due.push({ kind: "noc", rows: (data || []) as ReminderRequestRow[] });
  }

  // Collect unique emails to check unsubscribe status in one round-trip.
  const emails = Array.from(
    new Set(due.flatMap((b) => b.rows.map((r) => r.email).filter((e): e is string => !!e))),
  );

  let unsubscribed: Set<string> = new Set();
  if (emails.length > 0) {
    const { data: users, error } = await supabase
      .from("email_users")
      .select("email,unsubscribed_at")
      .in("email", emails);
    if (error) return errorResponse(error.message);
    unsubscribed = new Set(
      (users || [])
        .filter((u) => u.unsubscribed_at !== null)
        .map((u) => u.email as string),
    );
  }

  for (const bucket of due) {
    for (const row of bucket.rows) {
      stats.attempted++;
      if (!row.email) continue;
      if (unsubscribed.has(row.email)) {
        stats.skipped_unsubscribed++;
        // Mark as "sent" so we don't keep trying — they're unsubscribed.
        await markSent(supabase, row.id, bucket.kind);
        continue;
      }

      const result = await sendReminderEmail({
        kind: bucket.kind,
        email: row.email,
        rsvDate: row.rsv_date,
        timezone: row.timezone,
      });

      if (!result.ok) {
        stats.errors.push({ id: row.id, kind: bucket.kind, error: result.error || "unknown" });
        continue;
      }

      const updateErr = await markSent(supabase, row.id, bucket.kind);
      if (updateErr) {
        stats.errors.push({ id: row.id, kind: bucket.kind, error: updateErr });
        continue;
      }
      stats.sent++;
    }
  }

  return NextResponse.json(stats);
}

async function markSent(
  supabase: ReturnType<typeof getSupabase>,
  id: string,
  kind: "open" | "close" | "noc",
): Promise<string | null> {
  const col =
    kind === "open"
      ? "open_reminder_sent_at"
      : kind === "close"
        ? "close_reminder_sent_at"
        : "noc_reminder_sent_at";
  const { error } = await supabase
    .from("reminder_requests")
    .update({ [col]: new Date().toISOString() })
    .eq("id", id);
  return error ? error.message : null;
}

function errorResponse(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}
