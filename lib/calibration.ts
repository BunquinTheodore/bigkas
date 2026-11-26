// Score calibration as described in the design, section 7.
import { LAMBDA_GRID } from "./config";
import type { ScoreSet } from "./types";

export interface CalRow {
  speaker: string;
  native: number | null;
  meanRating: number | null;
}

export interface Line {
  alpha: number;
  beta: number;
}

export interface Fit {
  min: number;
  max: number;
  linear: Line | null;
  ridge: (Line & { lambda: number }) | null;
}

type RatedRow = CalRow & { native: number; meanRating: number };
type Range = { min: number; max: number };

const TIE_TOLERANCE = 1e-12;

const mean = (values: readonly number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Rating 1 to 5 mapped to 0 to 1. */
export function humanReference(meanRating: number): number {
  return (meanRating - 1) / 4;
}

export function clip01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Min max normalization. Not clipped, null when the range is flat. */
export function normalize(native: number, min: number, max: number): number | null {
  return max === min ? null : (native - min) / (max - min);
}

/** One predictor least squares with a penalty on the slope only. Lambda 0 is ordinary least squares. */
export function fitRidge(x: readonly number[], y: readonly number[], lambda: number): Line | null {
  if (x.length === 0 || x.length !== y.length) return null;
  const meanX = mean(x);
  const meanY = mean(y);
  const sxx = x.reduce((sum, v) => sum + (v - meanX) ** 2, 0);
  const sxy = x.reduce((sum, v, i) => sum + (v - meanX) * (y[i] - meanY), 0);
  if (sxx + lambda === 0) return null;
  const beta = sxy / (sxx + lambda);
  return { alpha: meanY - beta * meanX, beta };
}

/** Mean absolute error per speaker, then averaged so every speaker weighs the same. */
export function speakerMae(errors: readonly { speaker: string; error: number }[]): number | null {
  const speakers = [...new Set(errors.map((e) => e.speaker))];
  if (speakers.length === 0) return null;
  return mean(
    speakers.map((s) => mean(errors.filter((e) => e.speaker === s).map((e) => Math.abs(e.error)))),
  );
}

const ratedRows = (rows: readonly CalRow[]) =>
  rows.filter((r): r is RatedRow => r.native !== null && r.meanRating !== null);

function usableRange(rows: readonly CalRow[]): Range | null {
  const natives = rows.flatMap((r) => (r.native === null ? [] : [r.native]));
  if (natives.length === 0) return null;
  return { min: Math.min(...natives), max: Math.max(...natives) };
}

function fitOn(rows: readonly CalRow[], range: Range, lambda: number): Line | null {
  const rated = ratedRows(rows);
  const x = rated.map((r) => (r.native - range.min) / (range.max - range.min));
  const y = rated.map((r) => humanReference(r.meanRating));
  return fitRidge(x, y, lambda);
}

/** Error on one left out speaker, or null when this round cannot be run. */
function roundError(rows: readonly CalRow[], speaker: string, lambda: number): number | null {
  const train = rows.filter((r) => r.speaker !== speaker);
  const range = usableRange(train);
  if (!range || range.min === range.max) return null;
  const line = fitOn(train, range, lambda);
  if (!line) return null;
  const errors = ratedRows(rows.filter((r) => r.speaker === speaker)).map((r) => {
    const x = (r.native - range.min) / (range.max - range.min);
    return Math.abs(clip01(line.alpha + line.beta * x) - humanReference(r.meanRating));
  });
  return errors.length === 0 ? null : mean(errors);
}

/** Leave one speaker out cross validation. A tie goes to the larger penalty. */
export function selectLambda(rows: readonly CalRow[], grid: readonly number[]): number | null {
  const speakers = [...new Set(ratedRows(rows).map((r) => r.speaker))];
  let best: { lambda: number; error: number } | null = null;
  for (const lambda of [...grid].sort((a, b) => a - b)) {
    const errors = speakers.flatMap((s) => roundError(rows, s, lambda) ?? []);
    if (errors.length === 0) continue;
    const error = mean(errors);
    if (!best || error <= best.error + TIE_TOLERANCE) best = { lambda, error };
  }
  return best?.lambda ?? null;
}

/** Fits range, linear and ridge for one model and category from calibration rows. */
export function fitPipeline(rows: readonly CalRow[], grid: readonly number[] = LAMBDA_GRID): Fit | null {
  const range = usableRange(rows);
  if (!range) return null;
  if (range.min === range.max) return { ...range, linear: null, ridge: null };
  const lambda = selectLambda(rows, grid);
  const ridgeLine = lambda === null ? null : fitOn(rows, range, lambda);
  return {
    ...range,
    linear: fitOn(rows, range, 0),
    ridge: lambda !== null && ridgeLine ? { ...ridgeLine, lambda } : null,
  };
}

/** The four values shown for one score. Regressions use the unclipped value, results are clipped. */
export function applyFit(native: number | null, fit: Fit | null): ScoreSet {
  const unavailable: ScoreSet = { native, normalized: null, linear: null, ridge: null };
  if (native === null || fit === null) return unavailable;
  const x = normalize(native, fit.min, fit.max);
  if (x === null) return unavailable;
  const calibrated = (line: Line | null) => (line ? clip01(line.alpha + line.beta * x) : null);
  return { native, normalized: clip01(x), linear: calibrated(fit.linear), ridge: calibrated(fit.ridge) };
}
