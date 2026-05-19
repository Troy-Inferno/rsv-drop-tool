"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInZone } from "@/lib/rsv";
import { Countdown } from "@/components/Countdown";
import { SOURCE_TZ } from "@/lib/timezones";

interface Props {
  label: string;
  utcIso: string;
  zone: string;
  countdownPrefix?: string;
  accent?: "blue" | "green" | "amber" | "rose";
}

const ACCENT: Record<NonNullable<Props["accent"]>, string> = {
  blue: "border-l-4 border-l-[hsl(217,91%,40%)]",
  green: "border-l-4 border-l-emerald-500",
  amber: "border-l-4 border-l-amber-500",
  rose: "border-l-4 border-l-rose-500",
};

export function TimingCard({ label, utcIso, zone, countdownPrefix, accent = "blue" }: Props) {
  const local = formatInZone(utcIso, zone);
  const mt = formatInZone(utcIso, SOURCE_TZ);
  return (
    <Card className={ACCENT[accent]}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <Countdown targetUtc={utcIso} prefix={countdownPrefix} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <div className="text-xl font-bold tabular-nums leading-tight">
            {local.time}{" "}
            <span className="text-base font-medium text-muted-foreground">{local.zoneAbbr}</span>
          </div>
          <div className="text-sm text-muted-foreground">{local.date} · {zone}</div>
        </div>
        <div className="rounded-md bg-secondary/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Mountain Time: </span>
          <span className="font-semibold tabular-nums">{mt.time} {mt.zoneAbbr}</span>
          <span className="text-muted-foreground"> · {mt.date}</span>
        </div>
      </CardContent>
    </Card>
  );
}
