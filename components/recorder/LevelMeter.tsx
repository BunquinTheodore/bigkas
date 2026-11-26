"use client";

import { useEffect, useState } from "react";

const BARS = 24;
const REFRESH_MS = 80;
const MIN_HEIGHT = 6;
const MAX_HEIGHT = 52;

const quiet = () => Array.from({ length: BARS }, () => 0);

/** Recent loudness as bars, newest on the right. Flat when nothing is being recorded. */
export function LevelMeter({ read }: { read: (() => number) | null }) {
  const [levels, setLevels] = useState(quiet);

  useEffect(() => {
    if (!read) return;
    const timer = setInterval(() => setLevels((previous) => [...previous.slice(1), read()]), REFRESH_MS);
    return () => {
      clearInterval(timer);
      setLevels(quiet());
    };
  }, [read]);

  return (
    <div aria-hidden className="flex h-14 items-center justify-center gap-1">
      {levels.map((level, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-secondary/50"
          style={{ height: MIN_HEIGHT + Math.min(1, level * 2) * (MAX_HEIGHT - MIN_HEIGHT) }}
        />
      ))}
    </div>
  );
}
