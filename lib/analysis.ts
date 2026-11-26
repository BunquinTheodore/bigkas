// The hardcoded analysis: fixed, seeded values. The recording itself is never read.
import { NATIVE_MAX, UNAVAILABLE_RATE } from "./config";
import { createRng, gaussian, hashSeed } from "./rng";
import type { Category, Measures, ModelId } from "./types";

const NO_PAUSE_RATE = 0.15;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function mockNative(
  attemptId: string,
  itemId: string,
  model: ModelId,
  category: Category,
): number | null {
  const rng = createRng(hashSeed(attemptId, itemId, model, category));
  if (rng() < UNAVAILABLE_RATE) return null;
  return NATIVE_MAX[model] * clamp(0.65 + 0.15 * gaussian(rng), 0.05, 1);
}

export function mockMeasures(attemptId: string, itemId: string): Measures {
  const rng = createRng(hashSeed(attemptId, itemId, "measures"));
  const between = (low: number, high: number) =>
    rng() < UNAVAILABLE_RATE ? null : low + rng() * (high - low);
  const speechRate = between(2, 5);
  const pause = between(0.25, 0.9);
  const pauseLength = pause !== null && rng() < NO_PAUSE_RATE ? "none" : pause;
  return { speechRate, pauseLength, pitch: between(90, 260), intensity: between(55, 75) };
}
