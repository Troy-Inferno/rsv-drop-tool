/**
 * Calendar export helpers — generates .ics (RFC 5545) calendar files and
 * Google Calendar URL templates for the three key RSV moments:
 *
 *  - Window Open                (open time)
 *  - Window Closing Soon        (1 hour before close)
 *  - NOC Check                  (NOC processing time, 1900 MT)
 */

import { DateTime } from "luxon";
import type { RsvWindow } from "./rsv";

export type CalendarEventKind = "open" | "close_warning" | "noc";

export interface CalendarEvent {
  kind: CalendarEventKind;
  title: string;
  description: string;
  /** UTC ISO start moment */
  startUtc: string;
  /** Duration in minutes */
  durationMinutes: number;
}

const APP_NAME = "RSV Drop Tool";
const APP_AUTHOR = "Keith Fallon (PVD)";

export function buildCalendarEvents(rsvWindow: RsvWindow): CalendarEvent[] {
  const closeWarning = DateTime.fromISO(rsvWindow.closeUtc, { zone: "utc" })
    .minus({ hours: 1 })
    .toISO()!;

  const baseDesc = (extra: string) =>
    `${extra}\n\nRSV Date: ${rsvWindow.rsvDate}\n${APP_NAME} by ${APP_AUTHOR}.\nCrew Scheduling will NOT notify you — verify in NOC.`;

  return [
    {
      kind: "open",
      title: "RSV Drop Window Opens",
      description: baseDesc("Drop request window opens at 0900 MT, 48h before your RSV day."),
      startUtc: rsvWindow.openUtc,
      durationMinutes: 30,
    },
    {
      kind: "close_warning",
      title: "RSV Drop Window Closing in 1 Hour",
      description: baseDesc("Drop request window closes at 0900 MT, 24h before your RSV day."),
      startUtc: closeWarning,
      durationMinutes: 30,
    },
    {
      kind: "noc",
      title: "Check NOC for RSV Drop Result",
      description: baseDesc("Drop requests are processed by 1900 MT the evening before your RSV day. Check NOC."),
      startUtc: rsvWindow.nocCheckUtc,
      durationMinutes: 15,
    },
  ];
}

/** Format a UTC ISO timestamp as a UTC ICS DTSTAMP: 20260523T090000Z */
function toIcsUtc(utcIso: string): string {
  return DateTime.fromISO(utcIso, { zone: "utc" }).toFormat("yyyyLLdd'T'HHmmss'Z'");
}

/**
 * Default alarm triggers added to every generated calendar event.
 *
 * The user asked for two notifications by default:
 *   - 1 day before the event
 *   - 2 hours before the event
 *
 * ICS uses ISO 8601 durations with a leading "-" for "before":
 *   -P1D   = 1 day before
 *   -PT2H  = 2 hours before
 *
 * Calendar apps respect these on import. Users can delete or
 * customize alarms inside their own calendar after import.
 */
const DEFAULT_ALARM_TRIGGERS = ["-P1D", "-PT2H"] as const;

/** Escape ICS text per RFC 5545. */
function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Fold long lines to <=75 octets per RFC 5545. We approximate by char count. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + (i === 0 ? 75 : 74));
    out.push(i === 0 ? chunk : " " + chunk);
    i += i === 0 ? 75 : 74;
  }
  return out.join("\r\n");
}

/**
 * Build an ICS file (single VCALENDAR) for one or more events.
 * Times are stored in UTC to avoid having to ship VTIMEZONE blocks.
 */
export function buildIcs(
  events: CalendarEvent[],
  opts: { uidPrefix?: string } = {},
): string {
  const uidPrefix = opts.uidPrefix || "rsv-drop-tool";
  const now = toIcsUtc(DateTime.utc().toISO()!);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RSV Drop Tool//Keith Fallon PVD//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const evt of events) {
    const dtStart = toIcsUtc(evt.startUtc);
    const dtEnd = toIcsUtc(
      DateTime.fromISO(evt.startUtc, { zone: "utc" })
        .plus({ minutes: evt.durationMinutes })
        .toISO()!,
    );
    const uid = `${uidPrefix}-${evt.kind}-${dtStart}@rsv-drop-tool`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      foldLine(`SUMMARY:${escapeIcsText(evt.title)}`),
      foldLine(`DESCRIPTION:${escapeIcsText(evt.description)}`),
    );

    for (const trigger of DEFAULT_ALARM_TRIGGERS) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        foldLine(`DESCRIPTION:${escapeIcsText(evt.title)}`),
        `TRIGGER:${trigger}`,
        "END:VALARM",
      );
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Build a Google Calendar "add event" URL.
 * https://calendar.google.com/calendar/render?action=TEMPLATE&...
 */
export function buildGoogleCalendarUrl(evt: CalendarEvent): string {
  const dtStart = toIcsUtc(evt.startUtc);
  const dtEnd = toIcsUtc(
    DateTime.fromISO(evt.startUtc, { zone: "utc" })
      .plus({ minutes: evt.durationMinutes })
      .toISO()!,
  );
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: evt.title,
    dates: `${dtStart}/${dtEnd}`,
    details: evt.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
