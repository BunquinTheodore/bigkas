import { expect, test } from "vitest";
import { buildReport, meanRating, spearman, speakerRmse, type Fits } from "@/lib/agreement";
import { CATEGORIES, MODELS } from "@/lib/config";
import type { SampleRow } from "@/lib/types";

const line = { min: 0, max: 10, linear: { alpha: 0, beta: 1 }, ridge: { alpha: 0, beta: 1, lambda: 1 } };
const fits = Object.fromEntries(MODELS.map((m) => [m, Object.fromEntries(CATEGORIES.map((c) => [c, line]))])) as Fits;
const row = (speaker: string, native: number, ratings: (number | null)[], gopt: number | null = native,
  split: SampleRow["split"] = "test"): SampleRow => ({
  speaker, split, itemId: "item-01",
  ratings: { pronunciation: ratings, fluency: ratings, prosody: ratings },
  native: Object.fromEntries(MODELS.map((m) => [m, Object.fromEntries(
    CATEGORIES.map((c) => [c, m === "gopt" ? gopt : native]))])) as SampleRow["native"],
});

test("basics", () => {
  expect(meanRating([3, 4, 5])).toBe(4);
  expect(meanRating([3, null, 5])).toBeNull();
  expect(speakerRmse([{ speaker: "a", error: 0.1 }, { speaker: "a", error: 0.3 }, { speaker: "b", error: 0.6 }])).toBeCloseTo(0.452769, 5);
  expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
  expect(spearman([1, 2, 2, 3], [1, 3, 2, 4])).toBeCloseTo(0.948683, 5);
  expect(spearman([1, 1, 1], [1, 2, 3])).toBeNull();
});
test("report filters rows and counts coverage", () => {
  const report = buildReport([
    row("t1", 5, [3, 3, 3]), row("t1", 10, [3, 3, 3]), row("t2", 0, [2, 2, 2]),
    row("t2", 5, [3, 3, 3], null), row("t2", 5, [3, null, 3]),
    row("c1", 5, [1, 1, 1], 5, "calibration"),
  ], fits).fluency;
  expect([report.items, report.speakers]).toEqual([3, 2]);
  expect(report.models.gopt.coverage).toBeCloseTo(0.8);
  expect(report.models.hubert.coverage).toBe(1);
  const stats = report.models.gopt.methods.normalized;
  expect(stats.mae).toBeCloseTo(0.25);
  expect(stats.rmse).toBeCloseTo(0.306186, 5);
  expect(stats.spearman).toBeCloseTo(0.866025, 5);
});
