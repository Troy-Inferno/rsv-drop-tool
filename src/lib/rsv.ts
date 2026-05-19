/**
 * Core RSV drop-window calculations.
 *
 * Business rules:
 * - Open:  0900 America/Denver, 48 hours before RSV day (= 0900 MT, two days before).
 * - Close: 0900 America/Denver, 24 hours before RSV day (= 0900 MT, day before).
 * - NOC processing/check: 1900 America/Denver, evening before RSV day.
 *
 * "48 hours before the RSV day" is interpreted as the calendar-day anchor:
 * we open at 09:00 MT on the day that is two calendar days before the RSV
 * date. The arithmetic is identical to subtracting 48 hours from 09:00 MT
 * on the RSV day, but we anchor by calendar day so DST transitions in MT
 * don't shift the wall-clock open time.
 *
 * The RSV date itself is a *date*, not a moment in time. We treat the
 * RSV "day" as the calendar day in America/Denver, since the airline
 * operates on Mountain Time for crew scheduling rules.
 */

import { DateTime } from "luxon";
import { SOURCE_TZ } from "./timezones";

export interface RsvWindow {
  /** ISO YYYY-MM-DD date string of the RSV day (in MT calendar). */
  rsvDate: string;
  /** UTC ISO timestamps — these are the authoritative moments. */
  openUtc: string;
  closeUtc: string;
  nocCheckUtc: string;
}

export interface RsvWindowInZone extends RsvWindow {
  zone: string;
  openLocalIso: string;
  closeLocalIso: string;
  nocCheckLocalIso: string;
  openMtIso: string;
  closeMtIso: string;
  nocCheckMtIso: string;
}

/** Parse a YYYY-MM-DD string in the SOURCE_TZ. Throws on invalid input. */
export function parseRsvDate(yyyyMmDd: string): DateTime {
  const dt = DateTime.fromFormat(yyyyMmDd, "yyyy-MM-dd", { zone: SOURCE_TZ });
  if (!dt.isValid) {
    throw new Error(`Invalid RSV date: "${yyyyMmDd}" (expected YYYY-MM-DD)`);
  }
  return dt.startOf("day");
}

/**
 * Compute the open/close/NOC moments for an RSV date.
 *
 * Anchors:
 * - open:  RSV day minus 2 days at 09:00 MT
 * - close: RSV day minus 1 day  at 09:00 MT
 * - NOC:   RSV day minus 1 day  at 19:00 MT
 *
 * All Luxon math is performed in SOURCE_TZ so DST transitions in MT are
 * handled correctly.
 */
export function computeWindow(yyyyMmDd: string): RsvWindow {
  const rsvDay = parseRsvDate(yyyyMmDd);

  const open = rsvDay.minus({ days: 2 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
  const close = rsvDay.minus({ days: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
  const nocCheck = rsvDay.minus({ days: 1 }).set({ hour: 19, minute: 0, second: 0, millisecond: 0 });

  return {
    rsvDate: rsvDay.toFormat("yyyy-MM-dd"),
    openUtc: open.toUTC().toISO()!,
    closeUtc: close.toUTC().toISO()!,
    nocCheckUtc: nocCheck.toUTC().toISO()!,
  };
}

/**
 * Same as computeWindow, but additionally formats each moment in both
 * Mountain Time and the user's local zone for display.
 */
export function computeWindowInZone(yyyyMmDd: string, zone: string): RsvWindowInZone {
  const w = computeWindow(yyyyMmDd);

  const inZone = (utc: string) =>
    DateTime.fromISO(utc, { zone: "utc" }).setZone(zone).toISO()!;
  const inMt = (utc: string) =>
    DateTime.fromISO(utc, { zone: "utc" }).setZone(SOURCE_TZ).toISO()!;

  return {
    ...w,
    zone,
    openLocalIso: inZone(w.openUtc),
    closeLocalIso: inZone(w.closeUtc),
    nocCheckLocalIso: inZone(w.nocCheckUtc),
    openMtIso: inMt(w.openUtc),
    closeMtIso: inMt(w.closeUtc),
    nocCheckMtIso: inMt(w.nocCheckUtc),
  };
}

// ---------------------------------------------------------------------------
// Status + countdowns

export type RsvStatus =
  | "not_open"
  | "open"
  | "closing_soon"
  | "awaiting_noc"
  | "check_noc"
  | "closed";

export interface StatusInfo {
  status: RsvStatus;
  label: string;
  badgeClass: string;
  description: string;
}

const STATUS_META: Record<RsvStatus, Omit<StatusInfo, "status">> = {
  not_open: {
    label: "Not Open Yet",
    badgeClass: "status-not-open",
    description: "Drop request window has not opened.",
  },
  open: {
    label: "Window Open",
    badgeClass: "status-open",
    description: "You can submit your drop request now.",
  },
  closing_soon: {
    label: "Closing Soon",
    badgeClass: "status-closing",
    description: "Drop request window closes in less than 1 hour.",
  },
  awaiting_noc: {
    label: "Awaiting NOC Processing",
    badgeClass: "status-awaiting",
    description: "Window has closed. Awaiting NOC processing (by 1900 MT).",
  },
  check_noc: {
    label: "Check NOC",
    badgeClass: "status-noc",
    description: "Check NOC for status — Crew Scheduling will not notify you.",
  },
  closed: {
    label: "Closed",
    badgeClass: "status-closed",
    description: "The drop request cycle has fully completed.",
  },
};

/** Minutes before the close moment at which we flag "closing soon". */
export const CLOSING_SOON_MINUTES = 60;
/** Minutes after NOC processing time at which we flag the cycle "closed". */
export const CYCLE_END_MINUTES = 60 * 24; // 24h after NOC processing => closed

/**
 * Compute current status, given a window and a "now" reference (UTC ISO).
 * Default `now` is the wall clock at call time.
 */
export function computeStatus(window: RsvWindow, nowIso?: string): StatusInfo {
  const now = nowIso
    ? DateTime.fromISO(nowIso, { zone: "utc" })
    : DateTime.utc();
  const open = DateTime.fromISO(window.openUtc, { zone: "utc" });
  const close = DateTime.fromISO(window.closeUtc, { zone: "utc" });
  const noc = DateTime.fromISO(window.nocCheckUtc, { zone: "utc" });

  let status: RsvStatus;
  if (now < open) {
    status = "not_open";
  } else if (now < close) {
    const minutesUntilClose = close.diff(now, "minutes").minutes;
    status = minutesUntilClose <= CLOSING_SOON_MINUTES ? "closing_soon" : "open";
  } else if (now < noc) {
    status = "awaiting_noc";
  } else if (now < noc.plus({ minutes: CYCLE_END_MINUTES })) {
    status = "check_noc";
  } else {
    status = "closed";
  }

  return { status, ...STATUS_META[status] };
}

// ---------------------------------------------------------------------------
// Countdown formatting

export interface Countdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Human-readable like "2d 4h 13m" or "13m 22s". */
  short: string;
  /** "in 2d 4h 13m" or "1m 4s ago" depending on sign. */
  human: string;
}

export function countdownTo(targetUtc: string, nowIso?: string): Countdown {
  const target = DateTime.fromISO(targetUtc, { zone: "utc" });
  const now = nowIso ? DateTime.fromISO(nowIso, { zone: "utc" }) : DateTime.utc();
  const totalMs = target.toMillis() - now.toMillis();
  const abs = Math.abs(totalMs);

  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);

  let short: string;
  if (days > 0) short = `${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) short = `${hours}h ${minutes}m`;
  else if (minutes > 0) short = `${minutes}m ${seconds}s`;
  else short = `${seconds}s`;

  const human = totalMs >= 0 ? `in ${short}` : `${short} ago`;

  return { totalMs, days, hours, minutes, seconds, short, human };
}

// ---------------------------------------------------------------------------
// Display formatting helpers

export interface FormattedTime {
  /** "Sat, May 23, 2026" */
  date: string;
  /** "9:00 AM" */
  time: string;
  /** "MDT" or "EDT" — short zone name */
  zoneAbbr: string;
  /** "America/Denver" */
  zone: string;
}

export function formatInZone(utcIso: string, zone: string): FormattedTime {
  const dt = DateTime.fromISO(utcIso, { zone: "utc" }).setZone(zone);
  return {
    date: dt.toFormat("ccc, LLL d, yyyy"),
    time: dt.toFormat("h:mm a"),
    zoneAbbr: dt.toFormat("ZZZZ"),
    zone,
  };
}
