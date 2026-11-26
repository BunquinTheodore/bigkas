# bigkas Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the bigkas demo portal: reading sessions with recorded or uploaded answers, a hardcoded analysis with a visible status, calibrated scores, and an agreement report on sample data.

**Architecture:** A Next.js App Router app where every page is a client component and all data lives in the visitor's browser (IndexedDB, plus one localStorage key for who is signed in). Score math, status, mock analysis and report logic are pure functions in `lib/`, tested without a browser. Pages only load data, call those functions and render.

**Tech Stack:** Next.js 16.4.6, React 19.3.1, TypeScript 6.0.3, Tailwind CSS 4.3.5, idb 8.0.4, lucide-react 1.80.0, Inter Variable, Vitest 5.1.2, Playwright 1.65.1, Node 24, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-26-bigkas-poc-design.md`. Visual reference: `docs/mockups/apple-style.html`.

## Global Constraints

1. Analysis is hardcoded. No model, Praat, Whisper or FFmpeg code.
2. No API routes, server actions, database, environment variables or analytics. Audio never leaves the browser.
3. 10 items per attempt, one attempt per session, Submit locks an item, an unfinished attempt resumes at the next unsubmitted item.
4. Audio lasts 1 s to 30 s (0.5 s tolerance at the top), uploads are at most 10 MB, everything is stored as 16 kHz mono 16 bit WAV. Ask for `echoCancellation`, `noiseSuppression` and `autoGainControl` off.
5. Status after the tenth submit: Pending under 10 s, Processing under 30 s, then Completed.
6. Native ranges: GOPT 0 to 2, HuBERT Base and wav2vec 2.0 Large 0 to 10. Scores show 2 decimals, the report 3. Compute unrounded.
7. Every results view shows "Simulated". The report shows "Sample data".
8. Wording is "Reading session". No coaching, grades, streaks or badges.
9. UI copy: plain labels, no dashes in front of labels, no em or en dashes, never hyphenate or cut a word (`hyphens: none`).
10. Look: tokens from the mockup, light and dark follow the device, touch targets at least 44 px, reduced motion honoured, icons from lucide-react, no SF font files or SF Symbols.
11. Immutable updates. Functions under 50 lines, files under 400.
12. Commit at the end of a task only if the user has approved commits for this build. Never push, deploy or change repository settings unless asked. Never commit recordings, `.env` files, personal data or thesis files.
13. Every signed in page has "Sign out", which clears the signed in key and returns to `/`.

## Layout System (spec section 5, every UI task)

1. `Container` component: `max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8`. `TopBar` and `Screen` both use it. The research page uses it too.
2. Spacing steps only: Tailwind 1, 2, 3, 4, 6, 8, 12. Cards: `rounded-card p-4 sm:p-5`, grid gap 4, title block to content 6.
3. Breakpoints: `sm` 640, `three` 720 (sessions), `split` 900 (record and results), `lg` 1024. Define `--breakpoint-three: 45rem` and `--breakpoint-split: 56.25rem` in `@theme`.
4. Test ids for layout checks: `bar-title`, `bar-action`, `card`, `score-region`, `item-list`.
5. `tests/e2e/layout.spec.ts` grows with each UI task and checks at widths 360, 390, 834, 1280 and 1440: no sideways scroll, no clipped button, pill or cell text, shared left and right edges (1 px tolerance), equal card sizes where the spec says so.

```ts
// tests/e2e/layout.ts (shared checks, created in Task 6)
export const WIDTHS = [360, 390, 834, 1280, 1440] as const;
export async function expectNoOverflow(page: Page): Promise<void>;   // scrollWidth <= innerWidth, no clipped button, .pill, th, td, h1
export async function box(locator: Locator): Promise<{ x: number; y: number; width: number; height: number; right: number; bottom: number }>;
export function expectSame(values: number[], tolerance?: number): void; // max - min <= tolerance (default 1)
```

## Review Focus

1. A call, screen lock or app switch during recording: recording stops, says "Recording was interrupted. Record again.", saves nothing. (Task 8)
2. The link opens inside a chat app where the microphone is blocked: the page explains and upload still works. (Task 8)
3. A double tap on Submit, two tabs, or a full disk: one saved answer or a clear retry, never a crash or a lost take. (Tasks 5 and 8)
4. A file that is not audio, or is silent: a specific message, nothing saved. (Task 8)
5. Reload or Back in the middle of a session: the next unsubmitted item appears, never a locked one. (Task 8)

## File Structure

```
app/            layout.tsx, globals.css, page.tsx (sign in), consent/, sessions/,
                attempts/[attemptId]/ (page.tsx, record/, items/[n]/), research/
components/     Guard.tsx, AttemptGate.tsx, ui/, recorder/, results/, research/
lib/            types.ts, config.ts, rng.ts, calibration.ts, agreement.ts, fits.ts,
                items.ts, status.ts, analysis.ts, results.ts, format.ts,
                audio/ (wav.ts, process.ts, recorder.ts), recorder-state.ts,
                store/ (repository.ts, current.ts, client.ts)
data/           items.ts, sample-dataset.json
scripts/        generate-sample-data.ts
tests/          unit/, e2e/
```

---

### Task 1: Project foundation, shared types and seeded random

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/types.ts`, `lib/config.ts`, `lib/rng.ts`
- Modify: `.gitignore` (add `next-env.d.ts`, `*.tsbuildinfo`)
- Test: `tests/unit/rng.test.ts`

**Interfaces:**
- Produces, in `lib/types.ts`:

```ts
export type Role = "participant" | "researcher";
export type Category = "pronunciation" | "fluency" | "prosody";
export type ModelId = "gopt" | "hubert" | "wav2vec2";
export type SessionId = "a" | "b" | "c";
export type ItemType = "sentence" | "fragment";
export type Source = "recorded" | "uploaded";
export type Method = "normalized" | "linear" | "ridge";
export interface ReadingItem { id: string; type: ItemType; text: string }
export interface Profile { email: string; participantCode: string | null; consentedAt: number | null }
export interface Attempt { id: string; email: string; sessionId: SessionId; itemIds: string[]; submittedCount: number; startedAt: number; submittedAt: number | null }
export interface StoredResponse { attemptId: string; position: number; source: Source; wav: ArrayBuffer; durationMs: number; submittedAt: number }
export type Score = number | null;
export interface ScoreSet { native: Score; normalized: Score; linear: Score; ridge: Score }
export interface Measures { speechRate: number | null; pauseLength: number | "none" | null; pitch: number | null; intensity: number | null }
export interface ItemResult { position: number; itemId: string; source: Source; scores: Record<Category, Record<ModelId, ScoreSet>>; measures: Measures }
export interface SampleRow { speaker: string; split: "calibration" | "test"; itemId: string; ratings: Record<Category, (number | null)[]>; native: Record<ModelId, Record<Category, number | null>> }
```

- Produces, in `lib/config.ts` (only `import type` imports, so Node can load it directly):
  `ITEMS_PER_ATTEMPT = 10`, `MIN_RECORDING_SECONDS = 1`, `MAX_RECORDING_SECONDS = 30`, `DURATION_TOLERANCE_SECONDS = 0.5`, `MAX_UPLOAD_BYTES = 10 * 1024 * 1024`, `SILENCE_PEAK = 0.01`, `TARGET_SAMPLE_RATE = 16000`, `PENDING_MS = 10_000`, `COMPLETE_MS = 30_000`, `LAMBDA_GRID = [0.001, 0.01, 0.1, 1, 10, 100]`, `UNAVAILABLE_RATE = 1 / 30`, `SAMPLE_SEED = 20261126`, `CATEGORIES`, `MODELS`, `MODEL_LABELS` ("GOPT", "HuBERT Base", "wav2vec 2.0 Large"), `NATIVE_MAX` (2, 10, 10), `SESSIONS` (ids a, b, c titled "Session A", "Session B", "Session C")
- Produces, in `lib/rng.ts` (no imports): `hashSeed(...parts: (string | number)[]): number` (FNV-1a over `parts.join("|")`), `createRng(seed: number): () => number` (mulberry32, range [0, 1)), `gaussian(rng: () => number): number` (Box Muller)

- [ ] **Step 1: Write `package.json` and configs, then `npm install`**

`"type": "module"`, `"engines": {"node": "24.x"}`. Scripts: `dev`, `build`, `start` (Next), `typecheck: tsc --noEmit`, `test: vitest run`, `coverage: vitest run --coverage`, `test:e2e: playwright test`, `sample-data: node scripts/generate-sample-data.ts`.
Dependencies, exact versions: `next@16.4.6 react@19.3.1 react-dom@19.3.1 idb@8.0.4 lucide-react@1.80.0 @fontsource-variable/inter@5.3.0`.
Dev: `typescript@6.0.3 tailwindcss@4.3.5 @tailwindcss/postcss@4.3.5 vitest@5.1.2 @vitest/coverage-v8@5.1.2 @playwright/test@1.65.1 fake-indexeddb@6.2.8 @types/node@^24 @types/react@^19 @types/react-dom@^19`.
TypeScript stays on 6 because TypeScript 7 lacks the compiler API some tools need.
`tsconfig.json`: strict, `moduleResolution: bundler`, `resolveJsonModule`, `allowImportingTsExtensions`, `noEmit`, path `@/*` to `./*`, Next plugin.
`vitest.config.ts`: alias `@`, environment `node`, include `tests/unit/**/*.test.ts`, coverage include `lib/**` excluding `lib/audio/recorder.ts`, `lib/store/client.ts`, `lib/store/current.ts` (covered by Playwright), thresholds 80.
`app/page.tsx` renders the heading "bigkas".

- [ ] **Step 2: Write the failing test**

```ts
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
```

- [ ] **Step 3:** Run `npx vitest run tests/unit/rng.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 4:** Implement `lib/rng.ts`, `lib/types.ts`, `lib/config.ts`.
- [ ] **Step 5:** Run `npm test && npm run typecheck && npm run build`. Expected: all pass.
- [ ] **Step 6:** Commit `chore: set up bigkas app foundation`.

---

### Task 2: Calibration math

**Files:**
- Create: `lib/calibration.ts`
- Test: `tests/unit/calibration.test.ts`

**Interfaces:**
- Consumes: `ScoreSet`, `LAMBDA_GRID`
- Produces:

```ts
export interface CalRow { speaker: string; native: number | null; meanRating: number | null }
export interface Line { alpha: number; beta: number }
export interface Fit { min: number; max: number; linear: Line | null; ridge: (Line & { lambda: number }) | null }
export function humanReference(meanRating: number): number;          // (r - 1) / 4
export function clip01(value: number): number;
export function normalize(native: number, min: number, max: number): number | null; // unclipped
export function fitRidge(x: readonly number[], y: readonly number[], lambda: number): Line | null;
export function speakerMae(errors: readonly { speaker: string; error: number }[]): number | null;
export function selectLambda(rows: readonly CalRow[], grid: readonly number[]): number | null;
export function fitPipeline(rows: readonly CalRow[], grid?: readonly number[]): Fit | null;
export function applyFit(native: number | null, fit: Fit | null): ScoreSet;
```

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/calibration.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `fitRidge`: `beta = Sxy / (Sxx + lambda)`, `alpha = meanY - beta * meanX`, null when empty or the denominator is 0. `selectLambda`: for each lambda, leave out one speaker at a time; take `min` and `max` from the other speakers' valid scores (skip the round if equal or no rows), fit on their rated rows, predict the left out speaker's rated rows with unclipped `x`, clip, take that speaker's MAE; average over rounds; lowest average wins, ties within 1e-12 go to the larger lambda.
- [ ] **Step 4:** Run the test again. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add calibration math`.

---

### Task 3: Item bank, sample dataset and agreement math

**Files:**
- Create: `data/items.ts`, `lib/items.ts`, `scripts/generate-sample-data.ts`, `data/sample-dataset.json` (generated), `lib/agreement.ts`, `lib/fits.ts`
- Test: `tests/unit/sample-data.test.ts`, `tests/unit/agreement.test.ts`

**Interfaces:**
- Consumes: `fitPipeline`, `applyFit`, `speakerMae`, `humanReference`, `Fit`
- Produces:
  - `data/items.ts`: `ITEM_BANK: readonly ReadingItem[]`, ids `item-01` to `item-30`, 20 sentences and 10 fragments, interview themed, each at most 8 words and 45 letters (GOPT takes 50 phonemes). File comment: sample items until the real bank arrives.
  - `lib/items.ts`: `drawItemIds(rng: () => number): string[]` (10 distinct), `getItem(id: string): ReadingItem`
  - `lib/agreement.ts`:

```ts
export interface MethodStats { mae: number | null; rmse: number | null; spearman: number | null }
export interface ModelReport { coverage: number; methods: Record<Method, MethodStats> }
export interface CategoryReport { speakers: number; items: number; models: Record<ModelId, ModelReport> }
export type Fits = Record<ModelId, Record<Category, Fit | null>>;
export function meanRating(ratings: readonly (number | null)[]): number | null; // needs exactly 3
export function speakerRmse(errors: readonly { speaker: string; error: number }[]): number | null;
export function spearman(a: readonly number[], b: readonly number[]): number | null;
export function fitAll(calibration: readonly SampleRow[]): Fits;
export function buildReport(rows: readonly SampleRow[], fits: Fits): Record<Category, CategoryReport>;
```

  - `lib/fits.ts`: `SAMPLE_ROWS: readonly SampleRow[]`, `FITS: Fits` (fitted on the calibration rows)

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/sample-data.test.ts
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
```

```ts
// tests/unit/agreement.test.ts
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
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/sample-data.test.ts tests/unit/agreement.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write the item bank, `lib/items.ts` and the generator.** Generator, seeded with `SAMPLE_SEED`: speaker ability `u ~ N(0, 0.6)`; per row and category `q = u + N(0, 0.5)`; each rating `clamp(round(3.2 + q + N(0, 0.5)), 1, 5)`; each native score `NATIVE_MAX[m] * clamp(0.65 + 0.12 q + N(0, 0.1), 0, 1)`, same settings for all models, unavailable with `UNAVAILABLE_RATE`; with probability 1/50 a row loses one rating; shuffle speakers `S01` to `S25`, first 5 are calibration. Imports use `.ts` extensions.
- [ ] **Step 4:** Run `npm run sample-data` once and keep the output. Do not change the settings after looking at results.
- [ ] **Step 5: Implement `lib/agreement.ts` and `lib/fits.ts`.** Compared rows: split `test`, all three models valid for the category, `meanRating` not null, all derived values present. Coverage: test rows with a valid score divided by all test rows. Spearman: Pearson on average ranks.
- [ ] **Step 6:** Run `npm test`. Expected: PASS.
- [ ] **Step 7:** Commit `feat: add sample data and agreement math`.

---

### Task 4: Status, hardcoded analysis and result summaries

**Files:**
- Create: `lib/status.ts`, `lib/analysis.ts`, `lib/results.ts`, `lib/format.ts`
- Test: `tests/unit/results.test.ts`

**Interfaces:**
- Consumes: `FITS`, `applyFit`, `hashSeed`, `createRng`, `gaussian`
- Produces:

```ts
export type AttemptStatus = "not-started" | "in-progress" | "pending" | "processing" | "completed";
export function attemptStatus(attempt: Attempt | null, now: number): AttemptStatus;
export function statusLabel(status: AttemptStatus, submittedCount?: number): string; // "In progress 4 of 10"
export function mockNative(attemptId: string, itemId: string, model: ModelId, category: Category): number | null;
export function mockMeasures(attemptId: string, itemId: string): Measures;
export function itemResult(attempt: Attempt, position: number, source: Source, fits: Fits): ItemResult;
export interface Mean { value: number | null; n: number }
export function meanOf(values: readonly (number | "none" | null)[]): Mean;
export interface Summary { scores: Record<Category, Record<ModelId, Record<keyof ScoreSet, Mean>>>; measures: Record<keyof Measures, Mean> }
export function summarize(items: readonly ItemResult[]): Summary;
export function formatScore(value: number | null): string;   // "0.00" or "Unavailable"
export function formatMeasure(key: keyof Measures, value: number | "none" | null): string;
```

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/results.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Native: `NATIVE_MAX[m] * clamp(0.65 + 0.15 z, 0.05, 1)`. Measures: speech rate 2 to 5, pause `"none"` in 15% else 0.25 to 0.9, pitch 90 to 260, intensity 55 to 75, each unavailable with `UNAVAILABLE_RATE`. Seeds: `hashSeed(attemptId, itemId, ...)`. A negative elapsed time counts as 0.
- [ ] **Step 4:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add status, hardcoded analysis and summaries`.

---

### Task 5: Browser storage

**Files:**
- Create: `lib/store/repository.ts`, `lib/store/current.ts`, `lib/store/client.ts`
- Test: `tests/unit/repository.test.ts`

**Interfaces:**
- Consumes: `drawItemIds`, `ITEMS_PER_ATTEMPT`
- Produces:

```ts
export class StoreError extends Error { readonly code: "already-submitted" | "out-of-order" | "not-found" }
export interface NewResponse { attemptId: string; position: number; source: Source; wav: ArrayBuffer; durationMs: number }
export interface Repository {
  signIn(email: string, role: Role): Promise<Profile>;
  getProfile(email: string): Promise<Profile | null>;
  giveConsent(email: string, now: number): Promise<Profile>;
  startAttempt(email: string, sessionId: SessionId, rng: () => number, now: number): Promise<Attempt>;
  listAttempts(email: string): Promise<Attempt[]>;
  getAttempt(id: string): Promise<Attempt | null>;
  submitResponse(input: NewResponse, now: number): Promise<Attempt>;
  listResponses(attemptId: string): Promise<StoredResponse[]>;
  clearAll(): Promise<void>;
}
export function openRepository(name?: string): Promise<Repository>;      // default "bigkas"
// client.ts: getRepository(): Promise<Repository> (cached), storageAvailable(): Promise<boolean>
// current.ts: interface Current { email: string; role: Role }; readCurrent(), writeCurrent(c), clearCurrent()  (key "bigkas.current")
```

- [ ] **Step 1: Write the failing tests**

```ts
import "fake-indexeddb/auto";
import { expect, test } from "vitest";
import { createRng } from "@/lib/rng";
import { openRepository } from "@/lib/store/repository";

const fresh = () => openRepository(`test-${Math.random()}`);
const answer = (attemptId: string, position: number) =>
  ({ attemptId, position, source: "recorded" as const, wav: new ArrayBuffer(8), durationMs: 2000 });

test("codes are stable per email, researchers get none", async () => {
  const repo = await fresh();
  expect((await repo.signIn("a@b.com", "researcher")).participantCode).toBeNull();
  expect((await repo.signIn("a@b.com", "participant")).participantCode).toBe("P001");
  expect((await repo.signIn("c@d.com", "participant")).participantCode).toBe("P002");
  expect((await repo.signIn(" A@B.com ", "participant")).participantCode).toBe("P001");
});
test("one attempt per session with a fixed draw", async () => {
  const repo = await fresh();
  const first = await repo.startAttempt("a@b.com", "a", createRng(1), 100);
  expect(await repo.startAttempt("a@b.com", "a", createRng(2), 200)).toEqual(first);
  expect(new Set(first.itemIds).size).toBe(10);
});
test("order is enforced and the tenth item submits the attempt", async () => {
  const repo = await fresh();
  const { id } = await repo.startAttempt("a@b.com", "a", createRng(1), 0);
  await expect(repo.submitResponse(answer(id, 2), 1)).rejects.toMatchObject({ code: "out-of-order" });
  for (let p = 1; p <= 9; p++) expect((await repo.submitResponse(answer(id, p), p)).submittedAt).toBeNull();
  await expect(repo.submitResponse(answer(id, 1), 99)).rejects.toMatchObject({ code: "already-submitted" });
  expect((await repo.submitResponse(answer(id, 10), 500)).submittedAt).toBe(500);
});
test("two quick submits save once", async () => {
  const repo = await fresh();
  const { id } = await repo.startAttempt("a@b.com", "a", createRng(1), 0);
  const both = await Promise.allSettled([repo.submitResponse(answer(id, 1), 1), repo.submitResponse(answer(id, 1), 2)]);
  expect(both.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await repo.listResponses(id)).toHaveLength(1);
});
test("clearAll empties the store", async () => {
  const repo = await fresh();
  await repo.signIn("a@b.com", "participant");
  await repo.clearAll();
  expect(await repo.getProfile("a@b.com")).toBeNull();
});
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/repository.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement with idb.** Stores: `profiles` (key `email`), `attempts` (key `id`, index `email`), `responses` (key `[attemptId, position]`), `meta` (`participantCounter`). `startAttempt` and `submitResponse` each run in one readwrite transaction with no non database awaits inside. Ids from `crypto.randomUUID()`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add browser storage`.

---

### Task 6: Look, shared components, sign in, consent and guards

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/helpers.ts`, `tests/e2e/layout.ts`, `components/ui/{Container,TopBar,Screen,Card,Button,Segmented,Pill,StatusPill}.tsx`, `components/Guard.tsx`, `app/consent/page.tsx`
- Modify: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- Test: `tests/e2e/entry.spec.ts`, `tests/e2e/layout.spec.ts` (sign in and consent: card centred, equal left and right margins; consent buttons equal width)

**Interfaces:**
- Consumes: `getRepository`, `storageAvailable`, `readCurrent`, `writeCurrent`, `clearCurrent`, `statusLabel`
- Produces:

```tsx
TopBar(props: { title: string; back?: { label: string; href: string }; onSignOut?: () => void })
Screen(props: { title: string; wide?: boolean; children: React.ReactNode })
Card(props: React.HTMLAttributes<HTMLDivElement>)
Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "tinted" | "plain" })
Segmented<T extends string>(props: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void })
Pill(props: { tone?: "neutral" | "tint"; children: React.ReactNode })
StatusPill(props: { status: AttemptStatus; submittedCount?: number })
Guard(props: { role: Role; requireConsent?: boolean; children: (ctx: { profile: Profile; repo: Repository }) => React.ReactNode })
// tests/e2e/helpers.ts
signIn(page, role: "Participant" | "Researcher", email?: string): Promise<void>  // also agrees to consent for participants
```

- [ ] **Step 1: Configure Playwright.** `testDir: tests/e2e`, base URL `http://localhost:3000`, web server `npm run build && npm run start`. Project `chromium`: Desktop Chrome, permission `microphone`, args `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`. Project `webkit`: iPhone 15, `grep: /@upload/`. Run `npx playwright install chromium webkit` (large download).
- [ ] **Step 2: Write the failing test**

```ts
import { expect, test } from "@playwright/test";

test("participant signs in, consents and reaches reading sessions", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Participant" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agree" })).toBeDisabled();
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Agree" }).click();
  await expect(page).toHaveURL(/\/sessions$/);
});
test("a protected page sends visitors to sign in, and declining does too", async ({ page }) => {
  await page.goto("/consent");
  await expect(page).toHaveURL("/");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page).toHaveURL("/");
});
```

- [ ] **Step 3:** Run `npx playwright test entry --project=chromium`. Expected: FAIL.
- [ ] **Step 4: Add the look.** In `globals.css`, copy the light and dark variables from the mockup, map them with `@theme inline` (colours, `--radius-card: 20px`), font stack `-apple-system, BlinkMacSystemFont, "Inter Variable", "Segoe UI", system-ui, sans-serif`, `hyphens: none`, focus ring, reduced motion rule. Import `@fontsource-variable/inter` in `layout.tsx`. Build the components to match the mockup.
- [ ] **Step 5: Build the pages and guard.** Sign in copy: heading "bigkas", line "Calibrated read aloud speech scoring", field "Email", role control (Participant default), "Continue", "Clear demo data" with an inline "Erase everything, including unfinished sessions?" and buttons "Erase" and "Cancel" (no browser dialogs), footer "Demo. Nothing is sent anywhere.", and when storage is blocked "This browser is blocking storage, so the demo cannot run. Leave private mode or allow site data." with Continue disabled. Consent copy: "This is a demo. Your answers stay in this browser and are not sent anywhere." "You will read short sentences aloud and record them, or upload audio files." "Scores and measurements shown later are simulated." "You can erase everything with Clear demo data on the sign in screen." Checkbox "I am 18 or older", buttons "Agree", "Decline" (Decline signs out and returns to `/`). Guard: no sign in or wrong role goes to `/`; participant without consent goes to `/consent`.
- [ ] **Step 6:** Run the e2e test and `npm run typecheck`. Expected: PASS. Look at `/` and `/consent` at 390, 834 and 1440 px, light and dark.
- [ ] **Step 7:** Commit `feat: add interface foundation, sign in and consent`.

---

### Task 7: Reading sessions and audio processing

**Files:**
- Create: `app/sessions/page.tsx`, `lib/audio/wav.ts`, `lib/audio/process.ts`
- Modify: `tests/e2e/helpers.ts` (add `toneFile(seconds = 2, peak = 0.3): { name: string; mimeType: string; buffer: Buffer }`, a 440 Hz sine built with `encodeWav`, used from Task 8)
- Test: `tests/e2e/sessions.spec.ts`, `tests/unit/audio.test.ts`

**Interfaces:**
- Consumes: `Guard`, `Screen`, `StatusPill`, `attemptStatus`, `Repository`
- Produces:

```ts
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer; // PCM16 mono
export type Rejection = "unreadable" | "too-large" | "too-short" | "too-long" | "silent";
export type ProcessResult = { ok: true; wav: ArrayBuffer; durationMs: number } | { ok: false; reason: Rejection };
export const REJECTION_MESSAGES: Record<Rejection, string>;
export function downmix(channels: readonly Float32Array[]): Float32Array;
export function rejectSamples(samples: Float32Array, sampleRate: number): Rejection | null;
export function processAudio(blob: Blob): Promise<ProcessResult>;
```

Messages: "This file could not be read as audio." "Files must be 10 MB or smaller." "Audio must be at least 1 second long." "Audio must be 30 seconds or shorter." "No sound was detected. Try again."

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/audio.test.ts
import { expect, test } from "vitest";
import { downmix, rejectSamples } from "@/lib/audio/process";
import { encodeWav } from "@/lib/audio/wav";

const tone = (seconds: number, peak = 0.5) => new Float32Array(Math.round(seconds * 16000)).fill(peak);

test("16 kHz mono 16 bit header and clamped samples", () => {
  const v = new DataView(encodeWav(Float32Array.of(0, 1, -1, 2), 16000));
  expect(String.fromCharCode(...new Uint8Array(v.buffer, 0, 4))).toBe("RIFF");
  expect([v.getUint16(22, true), v.getUint32(24, true), v.getUint16(34, true), v.getUint32(40, true)]).toEqual([1, 16000, 16, 8]);
  expect([44, 46, 48, 50].map((at) => v.getInt16(at, true))).toEqual([0, 32767, -32768, 32767]);
});
test("downmix and limits", () => {
  expect(Array.from(downmix([Float32Array.of(1, 0), Float32Array.of(0, 0)]))).toEqual([0.5, 0]);
  expect(rejectSamples(tone(1), 16000)).toBeNull();
  expect(rejectSamples(tone(1).slice(1), 16000)).toBe("too-short");
  expect(rejectSamples(tone(30.5), 16000)).toBeNull();
  expect(rejectSamples(tone(30.6), 16000)).toBe("too-long");
  expect(rejectSamples(tone(2, 0.005), 16000)).toBe("silent");
  expect(rejectSamples(tone(2, 0.02), 16000)).toBeNull();
});
```

```ts
// tests/e2e/sessions.spec.ts
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("starting a session saves it as in progress", async ({ page }) => {
  await signIn(page, "Participant");
  await expect(page.getByText("Participant P001")).toBeVisible();
  await expect(page.getByText("Not started")).toHaveCount(3);
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page).toHaveURL(/\/attempts\/.+\/record$/);
  await page.goto("/sessions");
  await expect(page.getByText("In progress 0 of 10")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
});
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/audio.test.ts` and `npx playwright test sessions --project=chromium`. Expected: FAIL.
- [ ] **Step 3: Implement audio.** Order: size limit, `decodeAudioData` (failure means `unreadable`), downmix, `rejectSamples`, resample with `OfflineAudioContext(1, Math.ceil(duration * 16000), 16000)`, `encodeWav`.
- [ ] **Step 4: Build the sessions page.** Title "Reading sessions", "Participant P001", one card per session with title, `StatusPill` and a full width button (Start, Resume, View status or View results) pinned to the card bottom; note "Each session has 10 items. One attempt per session." Refresh status every second. Add to `layout.spec.ts`: at 834 and 1440 the three cards share top, width and height and the buttons share one y; at 390 they stack with equal widths; bar title, h1 and first card share the left edge.
- [ ] **Step 5:** Run both test commands. Expected: PASS.
- [ ] **Step 6:** Commit `feat: add reading sessions and audio processing`.

---

### Task 8: Recording and upload

**Files:**
- Create: `lib/recorder-state.ts`, `lib/audio/recorder.ts`, `components/AttemptGate.tsx`, `components/recorder/{RecordPanel,LevelMeter}.tsx`, `app/attempts/[attemptId]/record/page.tsx`
- Test: `tests/unit/recorder-state.test.ts`, `tests/e2e/record.spec.ts`

**Interfaces:**
- Consumes: `processAudio`, `REJECTION_MESSAGES`, `Repository.submitResponse`, `getItem`, `Guard`
- Produces:

```ts
export type PanelState =
  | { name: "ready"; message: string | null }
  | { name: "recording"; startedAt: number }
  | { name: "processing" }
  | { name: "review"; wav: ArrayBuffer; durationMs: number; source: Source; message: string | null }
  | { name: "saving"; wav: ArrayBuffer; durationMs: number; source: Source };
export type PanelEvent =
  | { type: "record"; now: number } | { type: "stop" } | { type: "file" }
  | { type: "processed"; result: ProcessResult; source: Source }
  | { type: "interrupted" } | { type: "micUnavailable" } | { type: "redo" }
  | { type: "submit" } | { type: "saved" } | { type: "saveFailed" };
export function panelReducer(state: PanelState, event: PanelEvent): PanelState; // unlisted pairs return the same state
export interface ActiveRecording { stop(): Promise<Blob>; cancel(): void; level(): number }
export function startRecording(onInterrupted: () => void): Promise<ActiveRecording>;
AttemptGate(props: { attemptId: string; repo: Repository; email: string; children: (attempt: Attempt, reload: () => void) => React.ReactNode })
```

Messages: "The microphone is unavailable. Allow access, or open this page in Safari or Chrome. You can still upload a file." "Recording was interrupted. Record again." "This item was not saved. Try Submit again." For another profile or unknown id: "This session is not in this profile's demo data." with a link "Go to reading sessions".

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/recorder-state.test.ts
import { expect, test } from "vitest";
import { panelReducer, type PanelState } from "@/lib/recorder-state";

const wav = new ArrayBuffer(8);
const saving: PanelState = { name: "saving", wav, durationMs: 1500, source: "recorded" };
const recording: PanelState = { name: "recording", startedAt: 0 };

test("interruption and blocked microphone explain themselves", () => {
  expect(panelReducer(recording, { type: "interrupted" })).toEqual({ name: "ready", message: "Recording was interrupted. Record again." });
  expect(panelReducer({ name: "ready", message: null }, { type: "micUnavailable" }))
    .toMatchObject({ message: expect.stringContaining("You can still upload a file.") });
});
test("a second submit is ignored and a failed save keeps the take", () => {
  expect(panelReducer(saving, { type: "submit" })).toBe(saving);
  expect(panelReducer(saving, { type: "saveFailed" }))
    .toMatchObject({ name: "review", wav, message: "This item was not saved. Try Submit again." });
});
test("a rejected file returns to ready with the reason", () => {
  expect(panelReducer({ name: "processing" }, { type: "processed", source: "uploaded", result: { ok: false, reason: "silent" } }))
    .toEqual({ name: "ready", message: "No sound was detected. Try again." });
});
```

```ts
// tests/e2e/record.spec.ts
import { expect, test } from "@playwright/test";
import { signIn, toneFile } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, "Participant");
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page.getByRole("heading", { name: "Item 1 of 10" })).toBeVisible();
});
test("record with the microphone and submit", async ({ page }) => {
  await page.getByRole("button", { name: "Record" }).click();
  await page.waitForTimeout(1600);
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("heading", { name: "Item 2 of 10" })).toBeVisible();
});
test("upload, then reload shows the next item @upload", async ({ page }) => {
  await page.getByLabel("Upload audio file").setInputFiles(toneFile());
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("heading", { name: "Item 2 of 10" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Item 2 of 10" })).toBeVisible();
});
test("silent and unreadable files are refused @upload", async ({ page }) => {
  const upload = page.getByLabel("Upload audio file");
  await upload.setInputFiles(toneFile(2, 0));
  await expect(page.getByText("No sound was detected. Try again.")).toBeVisible();
  await upload.setInputFiles({ name: "notes.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("not audio") });
  await expect(page.getByText("This file could not be read as audio.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Item 1 of 10" })).toBeVisible();
});
```

- [ ] **Step 2:** Run both. Expected: FAIL.
- [ ] **Step 3: Implement the reducer and capture.** `startRecording` uses `getUserMedia` with the three processing flags off, `MediaRecorder`, an `AnalyserNode` for `level()`, and calls `onInterrupted` when the track ends or the page becomes hidden. Always release tracks and the audio context.
- [ ] **Step 4: Build the panel and page** to match the mockup. Panel stops itself at 30 s, and "Play" plays the converted WAV. Page shows heading "Item n of 10" (n = `submittedCount + 1`), progress bar, "Sentence" or "Phrase fragment", the text, the panel keyed by n, and a "Sessions" back link. On `already-submitted` reload the attempt. After item 10 replace to `/attempts/[id]`; a submitted attempt opened here redirects there. From 900 px the text card and recording card sit side by side (3fr and 2fr, equal height, text centred in its card). Add to `layout.spec.ts`: at 1280 the two cards share top and bottom and their outer edges match the bar; at 390 they stack with equal widths.
- [ ] **Step 5:** Run `npm test`, `npx playwright test record` (both projects). Expected: PASS.
- [ ] **Step 6:** Commit `feat: add recording and upload`.

---

### Task 9: Status, session summary and item results

**Files:**
- Create: `app/attempts/[attemptId]/page.tsx`, `app/attempts/[attemptId]/items/[n]/page.tsx`, `components/results/{ScoreCards,MeasureGrid}.tsx`
- Test: `tests/e2e/results.spec.ts`

**Interfaces:**
- Consumes: `AttemptGate`, `attemptStatus`, `itemResult`, `summarize`, `FITS`, `formatScore`, `formatMeasure`, `Repository.listResponses`
- Produces: pages only

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "@playwright/test";
import { signIn, toneFile } from "./helpers";

test("ten answers move from Pending to results @upload", async ({ page }) => {
  await page.clock.install();
  await signIn(page, "Participant");
  await page.getByRole("button", { name: "Start" }).first().click();
  for (let n = 1; n <= 10; n++) {
    await expect(page.getByRole("heading", { name: `Item ${n} of 10` })).toBeVisible();
    await page.getByLabel("Upload audio file").setInputFiles(toneFile());
    await page.getByRole("button", { name: "Submit" }).click();
  }
  await expect(page.getByText("Pending")).toBeVisible();
  await page.clock.fastForward(11_000);
  await expect(page.getByText("Processing")).toBeVisible();
  await page.clock.fastForward(20_000);
  await expect(page.getByText("Simulated")).toBeVisible();
  for (const model of ["GOPT", "HuBERT Base", "wav2vec 2.0 Large"]) await expect(page.getByText(model)).toBeVisible();
  await page.getByRole("button", { name: "Fluency" }).click();
  await page.getByRole("link", { name: /^Item 1\b/ }).click();
  await expect(page.getByText("Uploaded")).toBeVisible();
  await page.getByRole("link", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Item 2 of 10" })).toBeVisible();
});
test("an unknown attempt explains itself", async ({ page }) => {
  await signIn(page, "Participant");
  await page.goto("/attempts/not-a-real-id");
  await expect(page.getByText("This session is not in this profile's demo data.")).toBeVisible();
});
```

- [ ] **Step 2:** Run `npx playwright test results`. Expected: FAIL.
- [ ] **Step 3: Build the pages.** Status page, before completion: `StatusPill` plus "Your answers are waiting to be analyzed." or "Analyzing your answers.", refreshed every second; in progress shows "Continue recording". Completed: "Simulated" pill, category `Segmented`, one score card per model (Native "of 2" or "of 10", Normalized, Linear, Ridge, each with "n of 10"), the four measurements with "n of 10", and links "Item 1" to "Item 10" with their text. Item page: heading "Item n of 10", "Simulated", "Recorded" or "Uploaded", Play (blob URL, revoked on leave), cards, measurements, Previous, Next, Summary. Not completed or n outside 1 to 10 goes to the status page. Both results pages share a `ResultsShell`: from 900 px a 240 px `item-list` card (Summary, Item 1 to 10, current one marked) beside the `score-region`, below 900 px the list follows the scores. Scores are a table from 640 px and one card per model below. Measurements are 4 tiles in a row from 640 px, 2 by 2 below. Previous and Next are equal width. Add to `layout.spec.ts`: at 1280 list and scores share the top, tiles share width; at 390 no overflow.
- [ ] **Step 4:** Run the test on both projects. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add status and results`.

---

### Task 10: Agreement report

**Files:**
- Create: `app/research/page.tsx`, `components/research/ReportTable.tsx`
- Test: `tests/e2e/research.spec.ts`

**Interfaces:**
- Consumes: `buildReport`, `SAMPLE_ROWS`, `FITS`, `Guard`, `Segmented`, `Pill`

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("researcher reads the report", async ({ page }) => {
  await signIn(page, "Researcher");
  await expect(page.getByRole("heading", { name: "Agreement with human ratings" })).toBeVisible();
  await expect(page.getByText("Sample data", { exact: true })).toBeVisible();
  await expect(page.getByText("Baseline").first()).toBeVisible();
  await expect(page.getByText("Held out speakers: 20.")).toBeVisible();
  await page.getByRole("button", { name: "Prosody" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
});
test("participants cannot open it", async ({ page }) => {
  await signIn(page, "Participant");
  await page.goto("/research");
  await expect(page).toHaveURL("/");
});
```

- [ ] **Step 2:** Run `npx playwright test research --project=chromium`. Expected: FAIL.
- [ ] **Step 3: Build the page.** Methods labelled "Baseline", "Linear", "Ridge"; columns MAE, RMSE, Spearman to 3 decimals ("Undefined" for null), coverage as a whole percent. Note: "These numbers tell nothing about the real models. Baseline is not fitted to the rating scale, so lower error after calibration is expected here." Footer "Held out speakers: N. Items compared: M." Table from 640 px, one card per model below, inside `Container`. Add to `layout.spec.ts`: no overflow at every width; table card edges match the bar.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add agreement report`.

---

### Task 11: Verify everything, then deploy

**Files:**
- Modify: `README.md` (how to run, test and deploy; all numbers are simulated)

- [ ] **Step 1:** Run `npm run typecheck && npm run coverage && npm run test:e2e && npm run build`. Expected: all pass, coverage at least 80%.
- [ ] **Step 2:** In a real browser at 390, 834 and 1440 px, light and dark, walk the flow in `docs/flow.md` section 6. Expected: no sideways scrolling, no cut or hyphenated words, every results view labelled.
- [ ] **Step 3:** Update the README, including that Safari can erase stored demo data after seven days of use without a visit, so demo data should be created shortly before a presentation. Commit `docs: describe how to run bigkas`.
- [ ] **Step 4: Ask the user for permission to push and to deploy.** Stop until they answer.
- [ ] **Step 5:** After approval, push, import the GitHub repository into Vercel as project `bigkas` (framework Next.js, no environment variables) and deploy. The user signs in to Vercel if asked.
- [ ] **Step 6:** On the live address, the user records and uploads on a real iPhone (Safari) and an Android phone (Chrome). Expected: both reach results, and the report opens.
