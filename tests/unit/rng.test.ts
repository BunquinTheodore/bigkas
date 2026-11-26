import { expect, test } from "vitest";
import { createRng, gaussian, hashSeed } from "@/lib/rng";

test("same parts give the same sequence", () => {
  const a = createRng(hashSeed("x", 1));
  const b = createRng(hashSeed("x", 1));
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});

test("different parts give different seeds", () => {
  expect(hashSeed("x", 1)).not.toBe(hashSeed("x", 2));
});

test("uniform stays in range and gaussian is centred", () => {
  const rng = createRng(7);
  const u = Array.from({ length: 10000 }, rng);
  expect(Math.min(...u)).toBeGreaterThanOrEqual(0);
  expect(Math.max(...u)).toBeLessThan(1);
  const g = Array.from({ length: 10000 }, () => gaussian(rng));
  const mean = g.reduce((s, v) => s + v, 0) / g.length;
  const sd = Math.sqrt(g.reduce((s, v) => s + (v - mean) ** 2, 0) / g.length);
  expect(Math.abs(mean)).toBeLessThan(0.05);
  expect(Math.abs(sd - 1)).toBeLessThan(0.05);
});
