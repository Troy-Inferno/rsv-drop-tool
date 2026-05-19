/**
 * GET /api/ics?rsvDate=YYYY-MM-DD&events=open,close,noc
 *
 * Generates an .ics file for one or more of the three RSV reminders.
 * - Events times are stored in UTC inside the ICS, so calendar apps
 *   render them in the user's local zone without us needing to ship
 *   VTIMEZONE blocks.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { computeWindow } from "@/lib/rsv";
import {
  buildCalendarEvents,
  buildIcs,
  type CalendarEventKind,
} from "@/lib/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_KINDS = new Set<CalendarEventKind>(["open", "close_warning", "noc"]);

const eventsSchema = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "open,close_warning,noc")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(
    z
      .array(z.enum(["open", "close_warning", "noc"]))
      .min(1, "At least one event kind required"),
  );

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rsvDate = searchParams.get("rsvDate");
  if (!rsvDate) {
    return new Response("Missing rsvDate", { status: 400 });
  }

  const eventsParsed = eventsSchema.safeParse(searchParams.get("events") ?? undefined);
  if (!eventsParsed.success) {
    return new Response("Invalid events param", { status: 400 });
  }

  let rsvWindow;
  try {
    rsvWindow = computeWindow(rsvDate);
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Bad date", { status: 400 });
  }

  const selected = new Set(eventsParsed.data);
  const allEvents = buildCalendarEvents(rsvWindow);
  const chosen = allEvents.filter((e) => selected.has(e.kind) && ALL_KINDS.has(e.kind));

  const ics = buildIcs(chosen, { uidPrefix: `rsv-${rsvWindow.rsvDate}` });

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsv-drop-${rsvWindow.rsvDate}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
