/**
 * /admin — private dashboard.
 *
 * Server component. Pulls the latest subscriber and reminder data from
 * Supabase, computes summary stats, and renders an organized read-only
 * view. Gated by the admin session cookie set at /admin/login.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  CheckCircle2,
  Clock,
  Download,
  LogOut,
  Mail,
  TriangleAlert,
  Users,
} from "lucide-react";
import { checkAdminAuth } from "@/lib/adminAuth";
import { getSupabase, type EmailUserRow, type ReminderRequestRow } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboard() {
  if (!(await checkAdminAuth())) {
    redirect("/admin/login");
  }

  const supabase = getSupabase();

  // Fire both queries in parallel to keep the dashboard responsive.
  const [{ data: usersData, error: usersErr }, { data: remindersData, error: remErr }] =
    await Promise.all([
      supabase.from("email_users").select("*"),
      supabase.from("reminder_requests").select("*"),
    ]);

  if (usersErr || remErr) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 text-xl font-bold">Admin error</h1>
        <p className="text-sm text-rose-700">
          Couldn&apos;t load data from Supabase: {(usersErr || remErr)?.message}
        </p>
      </div>
    );
  }

  const users = (usersData ?? []) as EmailUserRow[];
  const reminders = (remindersData ?? []) as ReminderRequestRow[];

  // -- Stats ------------------------------------------------------------
  const totalSubscribers = users.length;
  const activeSubscribers = users.filter((u) => !u.unsubscribed_at).length;
  const unsubscribed = users.filter((u) => u.unsubscribed_at).length;

  const totalReminders = reminders.length;
  const pendingReminderItems = reminders.reduce((sum, r) => {
    let pending = 0;
    if (r.remind_open && !r.open_reminder_sent_at) pending++;
    if (r.remind_close && !r.close_reminder_sent_at) pending++;
    if (r.remind_noc && !r.noc_reminder_sent_at) pending++;
    return sum + pending;
  }, 0);

  const sentReminderItems = reminders.reduce((sum, r) => {
    let sent = 0;
    if (r.open_reminder_sent_at) sent++;
    if (r.close_reminder_sent_at) sent++;
    if (r.noc_reminder_sent_at) sent++;
    return sum + sent;
  }, 0);

  // -- Per-subscriber rollup --------------------------------------------
  const reminderCountByEmail = new Map<string, number>();
  for (const r of reminders) {
    if (!r.email) continue;
    reminderCountByEmail.set(r.email, (reminderCountByEmail.get(r.email) ?? 0) + 1);
  }

  const sortedUsers = [...users].sort(
    (a, b) =>
      new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime(),
  );

  // -- Reminders sorted by upcoming trigger -----------------------------
  const now = DateTime.utc();
  const remindersByNextTrigger = [...reminders]
    .map((r) => {
      const open = DateTime.fromISO(r.open_time_utc, { zone: "utc" });
      const close = DateTime.fromISO(r.close_time_utc, { zone: "utc" });
      const noc = DateTime.fromISO(r.noc_check_time_utc, { zone: "utc" });
      // Next pending trigger time (the earliest still in the future or
      // not-yet-sent). Falls back to the noc time so completed cycles
      // sort to the bottom predictably.
      const candidates: number[] = [];
      if (r.remind_open && !r.open_reminder_sent_at) candidates.push(open.toMillis());
      if (r.remind_close && !r.close_reminder_sent_at) candidates.push(close.toMillis());
      if (r.remind_noc && !r.noc_reminder_sent_at) candidates.push(noc.toMillis());
      const nextMs =
        candidates.length > 0 ? Math.min(...candidates) : noc.toMillis();
      return { r, nextMs };
    })
    .sort((a, b) => a.nextMs - b.nextMs);

  const fmtLocal = (utc: string, zone: string) =>
    DateTime.fromISO(utc, { zone: "utc" })
      .setZone(zone)
      .toFormat("ccc LLL d, yyyy · h:mm a ZZZZ");

  const fmtRel = (utc: string | null) =>
    utc ? DateTime.fromISO(utc, { zone: "utc" }).toRelative() ?? "—" : "—";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            RSV Drop Tool
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live data from production. Refreshes on every load.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm font-medium hover:bg-secondary"
          >
            View site
          </Link>
          <form method="POST" action="/api/admin/logout">
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-sm font-medium hover:bg-secondary"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Stats */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Subscribers (active)"
          value={activeSubscribers}
          accent="text-emerald-600"
          sub={`${totalSubscribers} total · ${unsubscribed} unsubscribed`}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Reminders pending"
          value={pendingReminderItems}
          accent="text-amber-600"
          sub="Not yet fired"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Reminders sent"
          value={sentReminderItems}
          accent="text-blue-600"
          sub="All-time"
        />
        <StatCard
          icon={<Mail className="h-4 w-4" />}
          label="RSV days tracked"
          value={totalReminders}
          accent="text-slate-700"
          sub={`${reminderCountByEmail.size} unique emails configured`}
        />
      </section>

      {/* Subscribers table */}
      <section className="mb-10 rounded-xl border bg-white shadow-sm">
        <header className="flex flex-col gap-1 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Subscribers</h2>
            <p className="text-xs text-muted-foreground">
              One row per unique email. Sorted by most-recent signup first.
            </p>
          </div>
          <a
            href={`/api/admin/export?table=email_users&token=${process.env.ADMIN_EXPORT_TOKEN ?? ""}`}
            className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border bg-white px-3 text-sm font-medium hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">First seen</th>
                <th className="px-4 py-2.5">Last seen</th>
                <th className="px-4 py-2.5">RSV days</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No subscribers yet.
                  </td>
                </tr>
              )}
              {sortedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium">{u.email}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtRel(u.first_seen_at)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtRel(u.last_seen_at)}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {reminderCountByEmail.get(u.email) ?? 0}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.unsubscribed_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                        <TriangleAlert className="h-3 w-3" />
                        Unsubscribed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reminders schedule */}
      <section className="rounded-xl border bg-white shadow-sm">
        <header className="flex flex-col gap-1 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Reminder schedule</h2>
            <p className="text-xs text-muted-foreground">
              All RSV days currently configured. Sorted by next pending trigger.
            </p>
          </div>
          <a
            href={`/api/admin/export?table=reminder_requests&token=${process.env.ADMIN_EXPORT_TOKEN ?? ""}`}
            className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border bg-white px-3 text-sm font-medium hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">RSV date</th>
                <th className="px-4 py-2.5">Zone</th>
                <th className="px-4 py-2.5">Open</th>
                <th className="px-4 py-2.5">Close</th>
                <th className="px-4 py-2.5">NOC</th>
                <th className="px-4 py-2.5">Next trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {remindersByNextTrigger.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No reminders configured yet.
                  </td>
                </tr>
              )}
              {remindersByNextTrigger.map(({ r, nextMs }) => {
                const nextDt = DateTime.fromMillis(nextMs, { zone: "utc" }).setZone(r.timezone);
                const isPast = nextMs < now.toMillis();
                return (
                  <tr key={r.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-2.5 font-medium">{r.email ?? "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.rsv_date}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {r.timezone}
                    </td>
                    <td className="px-4 py-2.5">
                      <ReminderCell
                        wanted={r.remind_open}
                        sentAt={r.open_reminder_sent_at}
                        triggerUtc={r.open_time_utc}
                        zone={r.timezone}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <ReminderCell
                        wanted={r.remind_close}
                        sentAt={r.close_reminder_sent_at}
                        triggerUtc={r.close_time_utc}
                        zone={r.timezone}
                        closeWarn
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <ReminderCell
                        wanted={r.remind_noc}
                        sentAt={r.noc_reminder_sent_at}
                        triggerUtc={r.noc_check_time_utc}
                        zone={r.timezone}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <div className={isPast ? "text-muted-foreground" : "font-medium"}>
                        {nextDt.toFormat("ccc LLL d · h:mm a")}
                      </div>
                      <div className="text-muted-foreground">
                        {nextDt.toRelative() ?? ""}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        Sessions last 14 days. Sign out to invalidate this browser&apos;s session.
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers

function StatCard({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${accent}`}>
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ReminderCell({
  wanted,
  sentAt,
  triggerUtc,
  zone,
  closeWarn,
}: {
  wanted: boolean;
  sentAt: string | null;
  triggerUtc: string;
  zone: string;
  closeWarn?: boolean;
}) {
  if (!wanted) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  // For "close" the trigger is 1h before the recorded close_time_utc.
  // We also need the underlying close_time_utc itself to detect "missed":
  // after close_time_utc has passed, the cron filter `close_time > now`
  // permanently excludes the row, so it can never fire.
  const closeDeadlineUtc = closeWarn ? triggerUtc : null; // close_time_utc as-is
  const effectiveTriggerUtc = closeWarn
    ? DateTime.fromISO(triggerUtc, { zone: "utc" }).minus({ hours: 1 }).toISO()!
    : triggerUtc;
  const triggerDt = DateTime.fromISO(effectiveTriggerUtc, { zone: "utc" }).setZone(zone);
  const now = DateTime.utc();

  if (sentAt) {
    const sentDt = DateTime.fromISO(sentAt, { zone: "utc" });
    const lagMin = Math.round(
      sentDt.diff(DateTime.fromISO(effectiveTriggerUtc, { zone: "utc" }), "minutes")
        .minutes,
    );
    return (
      <div className="text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Sent
        </span>
        <div className="mt-1 text-muted-foreground">
          {lagMin >= 0 ? `+${lagMin} min` : `${lagMin} min`} from trigger
        </div>
      </div>
    );
  }

  // Not sent. Decide between Missed (won't fire), Late (overdue, cron will
  // pick it up on next tick), or Scheduled (in the future).
  const closeDeadlinePassed = closeDeadlineUtc
    ? now > DateTime.fromISO(closeDeadlineUtc, { zone: "utc" })
    : false;

  if (closeWarn && closeDeadlinePassed) {
    // Close warning window expired; cron will never pick this up.
    return (
      <div className="text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">
          <TriangleAlert className="h-3 w-3" />
          Missed
        </span>
        <div className="mt-1 text-muted-foreground">
          Window {triggerDt.toFormat("ccc h:mm a")} passed
        </div>
      </div>
    );
  }

  const triggerInPast = now > DateTime.fromISO(effectiveTriggerUtc, { zone: "utc" });
  if (triggerInPast) {
    return (
      <div className="text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
          <Clock className="h-3 w-3" />
          Late
        </span>
        <div className="mt-1 text-muted-foreground">
          {triggerDt.toRelative()} · cron will catch
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
        <Clock className="h-3 w-3" />
        Scheduled
      </span>
      <div className="mt-1 text-muted-foreground">
        {triggerDt.toFormat("ccc h:mm a")}
      </div>
    </div>
  );
}
