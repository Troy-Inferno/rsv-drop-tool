"use client";

import { Calendar, Download, ExternalLink } from "lucide-react";
import { buildCalendarEvents, buildGoogleCalendarUrl } from "@/lib/calendar";
import type { RsvWindow } from "@/lib/rsv";

interface Props {
  /** When omitted, buttons render in a disabled state with a "pick a date first" hint. */
  rsvWindow?: RsvWindow;
}

const anchorBtn =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto";

const disabledBtn =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-secondary/50 px-4 text-sm font-medium text-muted-foreground sm:w-auto pointer-events-none opacity-60";

export function CalendarButtons({ rsvWindow }: Props) {
  if (!rsvWindow) {
    return (
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <span className={disabledBtn}>
            <Download className="h-4 w-4" />
            Download .ics (all 3 events)
          </span>
          <span className={disabledBtn}>
            <Calendar className="h-4 w-4" />
            Add to Google Calendar
          </span>
          <span className={disabledBtn}>
            <Download className="h-4 w-4" />
            Apple Calendar (.ics)
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Enter your RSV date above to enable calendar downloads. Each event arrives with two alarms pre-set (1 day before + 2 hours before).
        </p>
      </div>
    );
  }

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
