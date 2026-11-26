// Writes data/sample-dataset.json. Run once with `npm run sample-data`.
// The settings were fixed before the first run and are not tuned to favour any model or method.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ITEM_BANK } from "../data/items.ts";
import {
  CATEGORIES,
  ITEMS_PER_ATTEMPT,
  MODELS,
  NATIVE_MAX,
  SAMPLE_SEED,
  UNAVAILABLE_RATE,
} from "../lib/config.ts";
import { createRng, gaussian } from "../lib/rng.ts";
import type { Category, SampleRow } from "../lib/types.ts";

const SPEAKERS = 25;
const CALIBRATION_SPEAKERS = 5;
const RATERS = 3;
const MISSING_RATING_RATE = 1 / 50;

const rng = createRng(SAMPLE_SEED);
const noise = (sd: number) => gaussian(rng) * sd;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function shuffle<T>(items: readonly T[]): T[] {
  const pool = [...items];
  return items.map(() => pool.splice(Math.floor(rng() * pool.length), 1)[0]);
}

function record<K extends string, V>(keys: readonly K[], value: (key: K) => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, value(key)])) as Record<K, V>;
}

function makeRow(speaker: string, split: SampleRow["split"], itemId: string, ability: number): SampleRow {
  const quality = record(CATEGORIES, () => ability + noise(0.5));
  const ratings = record(CATEGORIES, (c: Category) =>
    Array.from({ length: RATERS }, (): number | null => clamp(Math.round(3.2 + quality[c] + noise(0.5)), 1, 5)),
  );
  const native = record(MODELS, (m) =>
    record(CATEGORIES, (c) => {
      if (rng() < UNAVAILABLE_RATE) return null;
      const share = clamp(0.65 + 0.12 * quality[c] + noise(0.1), 0, 1);
      return Number((NATIVE_MAX[m] * share).toFixed(4));
    }),
  );
  if (rng() < MISSING_RATING_RATE) {
    const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
    ratings[category][Math.floor(rng() * RATERS)] = null;
  }
  return { speaker, split, itemId, ratings, native };
}

const speakers = Array.from({ length: SPEAKERS }, (_, i) => `S${String(i + 1).padStart(2, "0")}`);
const calibration = new Set(shuffle(speakers).slice(0, CALIBRATION_SPEAKERS));

const rows = speakers.flatMap((speaker) => {
  const ability = noise(0.6);
  const split = calibration.has(speaker) ? "calibration" : "test";
  return shuffle(ITEM_BANK)
    .slice(0, ITEMS_PER_ATTEMPT)
    .map((item) => makeRow(speaker, split, item.id, ability));
});

const target = fileURLToPath(new URL("../data/sample-dataset.json", import.meta.url));
writeFileSync(target, `[\n${rows.map((row) => JSON.stringify(row)).join(",\n")}\n]\n`);
