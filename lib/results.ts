// Item results and session summaries built from the hardcoded analysis and the fitted calibration.
import type { Fits } from "./agreement";
import { mockMeasures, mockNative } from "./analysis";
import { applyFit } from "./calibration";
import { CATEGORIES, MODELS } from "./config";
import { recordOf } from "./records";
import type { Attempt, Category, ItemResult, Measures, ModelId, ScoreSet, Source } from "./types";

export interface Mean {
  value: number | null;
  n: number;
}

export interface Summary {
  scores: Record<Category, Record<ModelId, Record<keyof ScoreSet, Mean>>>;
  measures: Record<keyof Measures, Mean>;
}

export const SCORE_KEYS: readonly (keyof ScoreSet)[] = ["native", "normalized", "linear", "ridge"];
export const MEASURE_KEYS: readonly (keyof Measures)[] = ["speechRate", "pauseLength", "pitch", "intensity"];

export function itemResult(attempt: Attempt, position: number, source: Source, fits: Fits): ItemResult {
  const itemId = attempt.itemIds[position - 1];
  return {
    position,
    itemId,
    source,
    scores: recordOf(CATEGORIES, (c) =>
      recordOf(MODELS, (m) => applyFit(mockNative(attempt.id, itemId, m, c), fits[m][c])),
    ),
    measures: mockMeasures(attempt.id, itemId),
  };
}

/** Mean of the numbers present, with how many items contributed. */
export function meanOf(values: readonly (number | "none" | null)[]): Mean {
  const numbers = values.filter((v): v is number => typeof v === "number");
  const value = numbers.length ? numbers.reduce((sum, v) => sum + v, 0) / numbers.length : null;
  return { value, n: numbers.length };
}

export function summarize(items: readonly ItemResult[]): Summary {
  return {
    scores: recordOf(CATEGORIES, (c) =>
      recordOf(MODELS, (m) => recordOf(SCORE_KEYS, (k) => meanOf(items.map((i) => i.scores[c][m][k])))),
    ),
    measures: recordOf(MEASURE_KEYS, (k) => meanOf(items.map((i) => i.measures[k]))),
  };
}
