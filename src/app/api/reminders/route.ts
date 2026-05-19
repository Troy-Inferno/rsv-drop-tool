/**
 * POST /api/reminders
 *
 * Creates a reminder request and (if an email was given) records the
 * user in email_users. If no reminder flags are set we still record the
 * email-only signup, but we don't write a reminder_requests row.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/db";
import { computeWindow } from "@/lib/rsv";
import { createReminderSchema } from "@/lib/validation";
import { hasSupabase } from "@/lib/env";
import { checkAndRecord, clientIp } from "@/lib/rateLimit";
import { isDisposableEmail } from "@/lib/disposableEmails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const wantsAnyReminder = input.remindOpen || input.remindClose || input.remindNoc;

  if (wantsAnyReminder && !input.email) {
    return NextResponse.json(
      { ok: false, error: "Email is required to receive reminders." },
      { status: 400 },
    );
  }

  // Reject disposable / burner email domains so we don't waste sends on
  // throwaway inboxes that never get read. We only check when an email
  // was actually provided — calculator-only usage (no email) is unaffected.
  if (input.email && isDisposableEmail(input.email)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Disposable / temporary email addresses aren't supported. Please use a real inbox so you actually receive your reminders.",
      },
      { status: 400 },
    );
  }

  // Per-IP rate limit on the public signup endpoint. We only consume a
  // rate-limit slot when the request actually wants to write to the DB
  // (either reminders OR an email signup). Pure calculations without a
  // DB write don't burn the budget.
  const shouldRateLimit =
    hasSupabase() && (wantsAnyReminder || Boolean(input.email));
  if (shouldRateLimit) {
    const ip = clientIp(req);
    const rl = await checkAndRecord(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: rl.error, resetAt: rl.resetAt },
        { status: 429 },
      );
    }
  }

  let rsvWindow;
  try {
    rsvWindow = computeWindow(input.rsvDate);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Bad date" },
      { status: 400 },
    );
  }

  // If Supabase isn't configured, allow the user to still see the
  // calculation by returning the window — they just don't get reminders.
  if (!hasSupabase()) {
    return NextResponse.json({
      ok: true,
      stored: false,
      reason: "Reminders are not configured on this deployment.",
      window: rsvWindow,
    });
  }

  const supabase = getSupabase();

  // Upsert the email user if an email was provided.
  if (input.email) {
    const now = new Date().toISOString();
    const { error: upsertErr } = await supabase
      .from("email_users")
      .upsert(
        {
          email: input.email,
          last_seen_at: now,
          source: "RSV Drop Tool",
        },
        { onConflict: "email" },
      );
    if (upsertErr) {
      return NextResponse.json(
        { ok: false, error: `Failed to record email: ${upsertErr.message}` },
        { status: 500 },
      );
    }
  }

  // If they didn't request any reminder, we're done.
  if (!wantsAnyReminder) {
    return NextResponse.json({ ok: true, stored: false, window: rsvWindow, recordedEmail: Boolean(input.email) });
  }

  const insert = {
    email: input.email!,
    rsv_date: rsvWindow.rsvDate,
    timezone: input.timezone,
    open_time_utc: rsvWindow.openUtc,
    close_time_utc: rsvWindow.closeUtc,
    noc_check_time_utc: rsvWindow.nocCheckUtc,
    remind_open: input.remindOpen,
    remind_close: input.remindClose,
    remind_noc: input.remindNoc,
  };

  const { data, error } = await supabase
    .from("reminder_requests")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Failed to save reminder: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    stored: true,
    id: data?.id,
    window: rsvWindow,
  });
}
