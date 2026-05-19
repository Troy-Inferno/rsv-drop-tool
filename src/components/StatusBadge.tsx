"use client";

import { Badge } from "@/components/ui/badge";
import type { StatusInfo } from "@/lib/rsv";

export function StatusBadge({ info }: { info: StatusInfo }) {
  return (
    <Badge className={info.badgeClass}>
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {info.label}
    </Badge>
  );
}
