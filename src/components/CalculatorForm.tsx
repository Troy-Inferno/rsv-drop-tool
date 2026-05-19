"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { CalendarClock, AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { STATE_TIMEZONES, findState, type StateOption } from "@/lib/timezones";
import { computeWindow, computeStatus } from "@/lib/rsv";
import { TimingCard } from "@/components/TimingCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CalendarButtons } from "@/components/CalendarButtons";

interface FormState {
  rsvDate: string;
  stateCode: string;
  zone: string;
  email: string;
  remindOpen: boolean;
  remindClose: boolean;
  remindNoc: boolean;
}

const TODAY = DateTime.now().toFormat("yyyy-LL-dd");

function defaultStateFromBrowser(): { code: string; zone: string } {
  if (typeof Intl === "undefined") return { code: "CO", zone: "America/Denver" };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  for (const s of STATE_TIMEZONES) {
    for (const z of s.zones) {
      if (z.iana === tz) return { code: s.code, zone: z.iana };
    }
  }
  return { code: "CO", zone: "America/Denver" };
}

export function CalculatorForm() {
  const initial = useMemo(defaultStateFromBrowser, []);
  const [form, setForm] = useState<FormState>({
    rsvDate: "",
    stateCode: initial.code,
    zone: initial.zone,
    email: "",
    remindOpen: false,
    remindClose: false,
    remindNoc: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Live "now" tick so the status badge auto-updates.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const state: StateOption | undefined = findState(form.stateCode);

  // When state changes, default the zone to its first listed zone.
  useEffect(() => {
    if (!state) return;
    if (!state.zones.some((z) => z.iana === form.zone)) {
      setForm((f) => ({ ...f, zone: state.zones[0].iana }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.stateCode]);

  const wantsReminder = form.remindOpen || form.remindClose || form.remindNoc;

  const calc = useMemo(() => {
    if (!form.rsvDate) return null;
    try {
      const w = computeWindow(form.rsvDate);
      const status = computeStatus(w);
      return { w, status };
    } catch {
      return null;
    }
  }, [form.rsvDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerMsg(null);
    if (!calc) {
      setServerMsg({ ok: false, text: "Please enter a valid RSV date." });
      return;
    }
    if (wantsReminder && !form.email) {
      setServerMsg({ ok: false, text: "Add an email address to receive reminders." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rsvDate: form.rsvDate,
          timezone: form.zone,
          email: form.email || undefined,
          remindOpen: form.remindOpen,
          remindClose: form.remindClose,
          remindNoc: form.remindNoc,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setServerMsg({
          ok: false,
          text:
            (data && (data.error as string)) ||
            "Couldn't save your reminder. Please try again.",
        });
      } else if (data.stored) {
        setServerMsg({
          ok: true,
          text: "Reminders are set. We'll email you at the times you selected.",
        });
      } else if (data.reason) {
        setServerMsg({ ok: true, text: data.reason });
      } else {
        setServerMsg({ ok: true, text: "Saved." });
      }
    } catch (err) {
      setServerMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Enter your RSV day
          </CardTitle>
          <CardDescription>
            Set it once. Get reminded before your drop window opens and closes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rsvDate">RSV date</Label>
                <Input
                  id="rsvDate"
                  type="date"
                  min={TODAY}
                  required
                  value={form.rsvDate}
                  onChange={(e) => setForm({ ...form, rsvDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State you&apos;ll be in</Label>
                <Select
                  id="state"
                  value={form.stateCode}
                  onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
                >
                  {STATE_TIMEZONES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pick the state where you&apos;ll be when your drop window opens. We use it to convert the 0900 / 0900 / 1900 Mountain Time anchors to your local time so you don&apos;t have to do the math.
                </p>
              </div>
            </div>

            {state && state.zones.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="zone">Time zone within {state.name}</Label>
                <Select
                  id="zone"
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                >
                  {state.zones.map((z) => (
                    <option key={z.iana} value={z.iana}>
                      {z.label} — {z.iana}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  {state.name} spans more than one time zone. Pick the one matching where you&apos;ll physically be.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Used only for reminders and service-related notices for the RSV Drop Tool. Unsubscribe any time.
              </p>
            </div>

            <fieldset className="space-y-3 rounded-lg border bg-secondary/40 p-4">
              <legend className="px-1 text-sm font-semibold">Email reminders</legend>
              <ReminderRow
                id="remindOpen"
                checked={form.remindOpen}
                onChange={(v) => setForm({ ...form, remindOpen: v })}
                title="Email me when window opens"
                subtitle="0900 Mountain Time, 48h before your RSV day"
              />
              <ReminderRow
                id="remindClose"
                checked={form.remindClose}
                onChange={(v) => setForm({ ...form, remindClose: v })}
                title="Email me 1 hour before window closes"
                subtitle="0800 Mountain Time, 24h before your RSV day"
              />
              <ReminderRow
                id="remindNoc"
                checked={form.remindNoc}
                onChange={(v) => setForm({ ...form, remindNoc: v })}
                title="Email me when it's time to check NOC"
                subtitle="1900 Mountain Time, the evening before your RSV day"
              />
            </fieldset>

            <fieldset className="space-y-3 rounded-lg border bg-secondary/40 p-4">
              <legend className="px-1 text-sm font-semibold">Add to your calendar</legend>
              <p className="text-xs text-muted-foreground">
                Drop the three key moments into Apple Calendar, Google Calendar, or any app that opens .ics files. Each event arrives with two alarms pre-set: <strong>1 day before</strong> and <strong>2 hours before</strong>.
              </p>
              <CalendarButtons rsvWindow={calc?.w} />
            </fieldset>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                You can set reminders days or weeks in advance.
              </p>
              <Button type="submit" size="lg" disabled={submitting || !form.rsvDate}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : wantsReminder ? (
                  <>
                    <Mail className="h-4 w-4" />
                    Set reminders
                  </>
                ) : (
                  <>Calculate window</>
                )}
              </Button>
            </div>

            {serverMsg && (
              <div
                role="status"
                className={
                  "flex items-start gap-2 rounded-md border p-3 text-sm " +
                  (serverMsg.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800")
                }
              >
                {serverMsg.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                )}
                <span>{serverMsg.text}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {calc && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Your drop window</span>
              <StatusBadge info={calc.status} />
            </CardTitle>
            <CardDescription>{calc.status.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <TimingCard
                label="Window opens"
                utcIso={calc.w.openUtc}
                zone={form.zone}
                accent="green"
                countdownPrefix="Opens"
              />
              <TimingCard
                label="Window closes"
                utcIso={calc.w.closeUtc}
                zone={form.zone}
                accent="amber"
                countdownPrefix="Closes"
              />
              <TimingCard
                label="Check NOC after"
                utcIso={calc.w.nocCheckUtc}
                zone={form.zone}
                accent="rose"
                countdownPrefix="NOC check"
              />
            </div>

            <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-900">
              <strong>Reminder:</strong> Crew Scheduling will <em>not</em> contact you. You must verify the
              outcome of your drop request yourself in NOC.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReminderRow({
  id,
  checked,
  onChange,
  title,
  subtitle,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  subtitle: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-background">
      <Checkbox
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </label>
  );
}
