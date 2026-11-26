import { expect, test } from "vitest";
import { ITEM_BANK } from "@/data/items";
import { CATEGORIES, MODELS, NATIVE_MAX } from "@/lib/config";
import { SAMPLE_ROWS } from "@/lib/fits";
import { drawItemIds } from "@/lib/items";
import { createRng } from "@/lib/rng";

test("25 speakers with 10 items each, 5 for calibration", () => {
  const by = Map.groupBy(SAMPLE_ROWS, (r) => r.speaker);
  expect(by.size).toBe(25);
  expect([...by.values()].every((rows) => rows.length === 10)).toBe(true);
  expect([...by.values()].filter((rows) => rows[0].split === "calibration")).toHaveLength(5);
});
test("scores in range, about 1 in 30 unavailable", () => {
  const all = SAMPLE_ROWS.flatMap((r) => MODELS.flatMap((m) => CATEGORIES.map((c) => ({ m, v: r.native[m][c] }))));
  expect(all.every(({ m, v }) => v === null || (v >= 0 && v <= NATIVE_MAX[m]))).toBe(true);
  const missing = all.filter(({ v }) => v === null).length / all.length;
  expect(missing).toBeGreaterThan(0.01);
  expect(missing).toBeLessThan(0.06);
});
test("whole ratings from 1 to 5, a few rows lack one", () => {
  const values = SAMPLE_ROWS.flatMap((r) => CATEGORIES.flatMap((c) => r.ratings[c]));
  expect(values.every((v) => v === null || [1, 2, 3, 4, 5].includes(v))).toBe(true);
  const lacking = SAMPLE_ROWS.filter((r) => CATEGORIES.some((c) => r.ratings[c].includes(null))).length;
  expect(lacking).toBeGreaterThan(0);
  expect(lacking).toBeLessThanOrEqual(15);
});
test("item bank fits GOPT and draws 10 different items", () => {
  expect(new Set(ITEM_BANK.map((i) => i.id)).size).toBe(30);
  expect(ITEM_BANK.filter((i) => i.type === "fragment")).toHaveLength(10);
  for (const { text } of ITEM_BANK) {
    expect(text.trim().split(/\s+/).length).toBeLessThanOrEqual(8);
    expect(text.replace(/[^a-z]/gi, "").length).toBeLessThanOrEqual(45);
  }
  expect(new Set(drawItemIds(createRng(1))).size).toBe(10);
});
test("reading items are general, not tied to a job or a field of study", () => {
  const narrow = /developer|code|computer|software|internship|career|deadline|project|college|team|task|feedback|manage|led/i;
  expect(ITEM_BANK.filter((item) => narrow.test(item.text)).map((item) => item.text)).toEqual([]);
});
test("retired item ids are not reused for different text", () => {
  expect(ITEM_BANK.every((item) => item.id.startsWith("read-"))).toBe(true);
});
