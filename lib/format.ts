import type { Measures } from "./types";

const UNAVAILABLE = "Unavailable";

const MEASURE_FORMAT: Record<keyof Measures, { digits: number; unit: string }> = {
  speechRate: { digits: 2, unit: "syll/s" },
  pauseLength: { digits: 2, unit: "s" },
  pitch: { digits: 0, unit: "Hz" },
  intensity: { digits: 1, unit: "dB" },
};

export function formatScore(value: number | null): string {
  return value === null ? UNAVAILABLE : value.toFixed(2);
}

export function formatMeasure(key: keyof Measures, value: number | "none" | null): string {
  if (value === null) return UNAVAILABLE;
  if (value === "none") return "No detected pauses";
  const { digits, unit } = MEASURE_FORMAT[key];
  return `${value.toFixed(digits)} ${unit}`;
}
