import { expect, test } from "vitest";
import { applyFit, fitPipeline, fitRidge, humanReference, normalize, selectLambda, speakerMae } from "@/lib/calibration";

const perfect = ["s1", "s2", "s3", "s4"].flatMap((speaker) =>
  [[0, 1], [5, 3], [10, 5]].map(([native, meanRating]) => ({ speaker, native, meanRating })));
const fit = { min: 0, max: 10, linear: { alpha: 0.1, beta: 0.8 }, ridge: { alpha: 0.2, beta: 0.5, lambda: 1 } };

test("reference and normalize", () => {
  expect([1, 4, 5].map(humanReference)).toEqual([0, 0.75, 1]);
  expect(normalize(7, 1, 5)).toBe(1.5);
  expect(normalize(1, 2, 2)).toBeNull();
});
test("least squares, and ridge shrinks the slope only", () => {
  expect(fitRidge([1, 2, 3], [2, 2, 5], 0)).toEqual({ alpha: 0, beta: 1.5 });
  expect(fitRidge([0, 0.5, 1], [0, 0.5, 1], 0.5)).toEqual({ alpha: 0.25, beta: 0.5 });
  expect(fitRidge([1, 1], [0, 1], 0)).toBeNull();
});
test("speakers weigh equally", () => {
  expect(speakerMae([{ speaker: "a", error: 0.1 }, { speaker: "a", error: -0.3 }, { speaker: "b", error: 0.6 }])).toBeCloseTo(0.4);
});
test("smallest penalty wins on perfectly linear data", () => {
  expect(selectLambda(perfect, [0.001, 0.1, 10])).toBe(0.001);
});
test("a tie goes to the larger penalty", () => {
  expect(selectLambda(perfect.map((r) => ({ ...r, meanRating: 3 })), [0.001, 1, 100])).toBe(100);
});
test("rounds with a flat training range are skipped", () => {
  const rows = [
    { speaker: "a", native: 5, meanRating: 2 }, { speaker: "a", native: 5, meanRating: 3 },
    { speaker: "b", native: 0, meanRating: 1 }, { speaker: "b", native: 10, meanRating: 5 }];
  expect(selectLambda(rows, [0.001])).toBe(0.001);
  expect(selectLambda(rows.slice(0, 2), [0.001])).toBeNull();
});
test("range uses unrated rows, regression does not", () => {
  const base = fitPipeline(perfect)!;
  expect([base.min, base.max, base.ridge!.lambda]).toEqual([0, 10, 0.001]);
  expect(base.linear!.beta).toBeCloseTo(1);
  expect(base.ridge!.beta).toBeLessThan(base.linear!.beta);
  expect(fitPipeline([...perfect, { speaker: "s5", native: 20, meanRating: null }])!.max).toBe(20);
});
test("regress the unclipped value, clip the result", () => {
  const s = applyFit(12, fit);
  expect(s).toMatchObject({ native: 12, normalized: 1, linear: 1 });
  expect(s.ridge).toBeCloseTo(0.8);
});
test("unavailable values", () => {
  expect(applyFit(null, fit)).toEqual({ native: null, normalized: null, linear: null, ridge: null });
  expect(applyFit(5, { min: 5, max: 5, linear: null, ridge: null }))
    .toEqual({ native: 5, normalized: null, linear: null, ridge: null });
});
