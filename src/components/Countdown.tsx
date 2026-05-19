"use client";

import { useEffect, useState } from "react";
import { countdownTo } from "@/lib/rsv";

interface Props {
  targetUtc: string;
  prefix?: string;
}

export function Countdown({ targetUtc, prefix = "" }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const c = countdownTo(targetUtc);
  return (
    <span className="font-mono text-sm tabular-nums" data-tick={tick}>
      {prefix ? `${prefix} ` : ""}
      {c.human}
    </span>
  );
}
