"use client";

import { Calendar, Download, ExternalLink } from "lucide-react";
import { buildCalendarEvents, buildGoogleCalendarUrl } from "@/lib/calendar";
import type { RsvWindow } from "@/lib/rsv";

interface Props {
  rsvWindow: RsvWindow;
}

const anchorBtn =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto";

export function CalendarButtons({ rsvWindow }: Props) {
  const events = buildCalendarEvents(rsvWindow);
  const allIcs = `/api/ics?rsvDate=${encodeURIComponent(rsvWindow.rsvDate)}&events=open,close_warning,noc`;
  const openIcs = `/api/ics?rsvDate=${encodeURIComponent(rsvWindow.rsvDate)}&events=open`;
  const openEvt = events.find((e) => e.kind === "open")!;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <a href={allIcs} download className={anchorBtn}>
        <Download className="h-4 w-4" />
        Download .ics (all 3 events)
      </a>
      <a
        href={buildGoogleCalendarUrl(openEvt)}
        target="_blank"
        rel="noopener noreferrer"
        className={anchorBtn}
      >
        <Calendar className="h-4 w-4" />
        Add to Google Calendar
        <ExternalLink className="h-3.5 w-3.5 opacity-60" />
      </a>
      <a href={openIcs} download className={anchorBtn}>
        <Download className="h-4 w-4" />
        Apple Calendar (.ics)
      </a>
    </div>
  );
}
