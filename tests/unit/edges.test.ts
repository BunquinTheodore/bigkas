// Error and edge paths: missing input never turns into an invented value.
import "fake-indexeddb/auto";
import { expect, test } from "vitest";
import { buildReport, fitAll, spearman, speakerRmse } from "@/lib/agreement";
import { processAudio } from "@/lib/audio/process";
import { applyFit, fitPipeline, fitRidge, selectLambda, speakerMae } from "@/lib/calibration";
import { MAX_UPLOAD_BYTES } from "@/lib/config";
import { formatMeasure } from "@/lib/format";
import { getItem } from "@/lib/items";
import { statusLabel } from "@/lib/status";
import { openRepository } from "@/lib/store/repository";

test("empty input gives no value rather than a number", () => {
  expect(speakerMae([])).toBeNull();
  expect(speakerRmse([])).toBeNull();
  expect(spearman([1], [1])).toBeNull();
  expect(fitRidge([], [], 1)).toBeNull();
  expect(fitRidge([1, 2], [1], 1)).toBeNull();
  expect(fitPipeline([])).toBeNull();
  expect(selectLambda([], [1])).toBeNull();
});

test("a flat calibration range leaves derived values unavailable", () => {
  const rows = [
    { speaker: "a", native: 3, meanRating: 2 },
    { speaker: "b", native: 3, meanRating: 4 },
  ];
  expect(fitPipeline(rows)).toEqual({ min: 3, max: 3, linear: null, ridge: null });
  expect(applyFit(3, null)).toEqual({ native: 3, normalized: null, linear: null, ridge: null });
});

test("one calibration speaker cannot choose a penalty, so ridge is unavailable", () => {
  const fit = fitPipeline([
    { speaker: "a", native: 0, meanRating: 1 },
    { speaker: "a", native: 10, meanRating: 5 },
  ]);
  expect(fit?.linear).not.toBeNull();
  expect(fit?.ridge).toBeNull();
});

test("a report with no held out rows reports nothing", () => {
  const report = buildReport([], fitAll([])).fluency;
  expect(report.items).toBe(0);
  expect(report.models.gopt.coverage).toBe(0);
  expect(report.models.gopt.methods.ridge).toEqual({ mae: null, rmse: null, spearman: null });
});

test("unknown items and unavailable measurements are reported", () => {
  expect(() => getItem("item-99")).toThrow("Unknown reading item: item-99");
  expect(formatMeasure("pitch", null)).toBe("Unavailable");
  expect(statusLabel("pending")).toBe("Pending");
  expect(statusLabel("in-progress")).toBe("In progress 0 of 10");
});

test("oversized uploads are refused before reading them", async () => {
  const huge = new Blob([new Uint8Array(MAX_UPLOAD_BYTES + 1)]);
  expect(await processAudio(huge)).toEqual({ ok: false, reason: "too-large" });
});

test("missing records are reported, not invented", async () => {
  const repo = await openRepository(`edges-${Math.random()}`);
  const answer = { attemptId: "nope", position: 1, source: "recorded" as const, wav: new ArrayBuffer(1), durationMs: 1 };
  expect(await repo.getProfile("x@y.com")).toBeNull();
  expect(await repo.getAttempt("nope")).toBeNull();
  await expect(repo.giveConsent("x@y.com", 1)).rejects.toMatchObject({ code: "not-found" });
  await expect(repo.submitResponse(answer, 1)).rejects.toMatchObject({ code: "not-found" });
  await repo.signIn("x@y.com", "participant");
  expect((await repo.giveConsent("x@y.com", 5)).consentedAt).toBe(5);
  expect(await repo.listAttempts("x@y.com")).toEqual([]);
});
