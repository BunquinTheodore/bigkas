// Turns item results and session means into the cells and tiles the pages show.
import { ITEMS_PER_ATTEMPT, MODELS, NATIVE_MAX } from "@/lib/config";
import { formatMeasure, formatScore, MEASURE_LABELS } from "@/lib/format";
import { MEASURE_KEYS, SCORE_KEYS, type Mean, type Summary } from "@/lib/results";
import { recordOf } from "@/lib/records";
import type { Category, ItemResult, Measures, ModelId, ScoreSet } from "@/lib/types";

export interface ScoreCell {
  value: string;
  notes: string[];
}

export interface ScoreRow {
  model: ModelId;
  cells: Record<keyof ScoreSet, ScoreCell>;
}

export interface Tile {
  label: string;
  value: string;
  note?: string;
}

const scaleNote = (model: ModelId, key: keyof ScoreSet, value: number | null) =>
  key === "native" && value !== null ? [`of ${NATIVE_MAX[model]}`] : [];

const countNote = (mean: Mean) => `${mean.n} of ${ITEMS_PER_ATTEMPT} items`;

export function itemRows(result: ItemResult, category: Category): ScoreRow[] {
  return MODELS.map((model) => ({
    model,
    cells: recordOf(SCORE_KEYS, (key) => {
      const value = result.scores[category][model][key];
      return { value: formatScore(value), notes: scaleNote(model, key, value) };
    }),
  }));
}

export function summaryRows(summary: Summary, category: Category): ScoreRow[] {
  return MODELS.map((model) => ({
    model,
    cells: recordOf(SCORE_KEYS, (key) => {
      const mean = summary.scores[category][model][key];
      return { value: formatScore(mean.value), notes: [...scaleNote(model, key, mean.value), countNote(mean)] };
    }),
  }));
}

export function itemTiles(measures: Measures): Tile[] {
  return MEASURE_KEYS.map((key) => ({ label: MEASURE_LABELS[key], value: formatMeasure(key, measures[key]) }));
}

export function summaryTiles(summary: Summary): Tile[] {
  return MEASURE_KEYS.map((key) => ({
    label: MEASURE_LABELS[key],
    value: formatMeasure(key, summary.measures[key].value),
    note: countNote(summary.measures[key]),
  }));
}
