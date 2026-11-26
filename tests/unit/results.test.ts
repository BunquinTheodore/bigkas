import { expect, test } from "vitest";
import { mockMeasures, mockNative } from "@/lib/analysis";
import { applyFit } from "@/lib/calibration";
import { FITS } from "@/lib/fits";
import { formatMeasure, formatScore } from "@/lib/format";
import { itemResult, meanOf, summarize } from "@/lib/results";
import { attemptStatus, statusLabel } from "@/lib/status";
import type { Attempt } from "@/lib/types";

const attempt: Attempt = { id: "t", email: "a@b.com", sessionId: "a", submittedCount: 10, startedAt: 0, submittedAt: 1000,
  itemIds: Array.from({ length: 10 }, (_, i) => `item-${String(i + 1).padStart(2, "0")}`) };

test("status follows the time since the tenth item", () => {
  const at = (now: number) => attemptStatus(attempt, now);
  expect(attemptStatus(null, 0)).toBe("not-started");
  expect(attemptStatus({ ...attempt, submittedAt: null }, 0)).toBe("in-progress");
  expect([at(0), at(10999), at(11000), at(30999), at(31000)])
    .toEqual(["pending", "pending", "processing", "processing", "completed"]);
  expect(statusLabel("in-progress", 4)).toBe("In progress 4 of 10");
});
test("analysis is fixed, in range, sometimes unavailable", () => {
  expect(mockMeasures("t", "item-01")).toEqual(mockMeasures("t", "item-01"));
  const values = Array.from({ length: 3000 }, (_, i) => mockNative(`a${i}`, "item-01", "gopt", "prosody"));
  const present = values.filter((v): v is number => v !== null);
  expect(present.every((v) => v >= 0 && v <= 2)).toBe(true);
  expect(1 - present.length / 3000).toBeGreaterThan(0.015);
  expect(1 - present.length / 3000).toBeLessThan(0.06);
  const pauses = Array.from({ length: 500 }, (_, i) => mockMeasures(`a${i}`, "item-01").pauseLength);
  expect(pauses).toContain("none");
  expect(pauses.every((p) => typeof p !== "number" || p >= 0.25)).toBe(true);
});
test("derived scores come from the native score", () => {
  const result = itemResult(attempt, 1, "recorded", FITS);
  expect(result.scores.fluency.hubert).toEqual(
    applyFit(mockNative("t", "item-01", "hubert", "fluency"), FITS.hubert.fluency));
});
test("means skip unavailable and none, and count what is left", () => {
  expect(meanOf([1, null, 3, "none"])).toEqual({ value: 2, n: 2 });
  expect(meanOf([null, "none"])).toEqual({ value: null, n: 0 });
  const items = [1, 2].map((p) => itemResult(attempt, p, "recorded", FITS));
  expect(summarize(items).measures.speechRate.n).toBeLessThanOrEqual(2);
});
test("formatting", () => {
  expect(formatScore(0.5)).toBe("0.50");
  expect(formatScore(null)).toBe("Unavailable");
  expect(formatMeasure("pauseLength", "none")).toBe("No detected pauses");
  expect(formatMeasure("speechRate", 3)).toBe("3.00 syll/s");
  expect(formatMeasure("pitch", 182.4)).toBe("182 Hz");
  expect(formatMeasure("intensity", 64)).toBe("64.0 dB");
});
