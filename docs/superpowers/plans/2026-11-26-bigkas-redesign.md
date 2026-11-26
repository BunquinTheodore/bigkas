# bigkas Redesign (calm depth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give bigkas depth, one 3D voice orb that follows the microphone, and clearer guidance on every screen.

**Architecture:** Depth and motion are CSS tokens in `app/globals.css`. The orb is a client component that shows a plain fallback and swaps in a lazily imported three.js scene when the device allows it. Guidance is small presentational components fed by state the pages already hold.

**Tech Stack:** Next.js 16.4.6, React 19.3.1, Tailwind CSS 4.3.5, three 0.187.0, @types/three 0.187.0, Playwright 1.65.1.

**Spec:** `docs/superpowers/specs/2026-11-26-bigkas-redesign-design.md`

## Global Constraints

1. No change to data, scoring, flows or wording of Simulated and Sample data labels. No coaching, grading or praise.
2. Plain labels, no dashes or decorative lines in front, never hyphenate or cut a word.
3. Container 1080 px, card radius 20 px, existing breakpoints, shared edges, touch targets at least 44 px, visible focus.
4. Text contrast at least 4.5 to 1 in both themes, also over the strongest part of the background wash.
5. Reduced motion: no animation, no 3D.
6. 3D download at most 150 kB compressed, requested only on screens with an orb, after the page is usable.
7. No external requests, no environment variables. Functions under 50 lines, immutable updates.
8. No commit, push or deploy unless the owner asks.

## Review Focus

1. The graphics context is lost (phone returns from the background): the fallback shows, nothing breaks. Task 2.
2. Moving between sign in and recording many times: no "too many WebGL contexts" warning. Task 2.
3. Leaving a screen while the 3D code is still downloading: no error. Task 2.
4. Reduced motion switched on while a screen is open: the orb gives way to the fallback. Task 2.
5. A very small window (320 px wide): nothing overlaps or scrolls sideways. Task 6.

## File Structure

| File | Responsibility |
|---|---|
| `app/globals.css` | Elevation, wash and motion tokens, `short` variant |
| `components/orb/VoiceOrb.tsx` | Decides orb or fallback, lazy loads the scene, runs the frame loop |
| `components/orb/scene.ts` | three.js only: build, draw, resize, dispose |
| `components/orb/useOrbAllowed.ts` | Reduced motion and WebGL support |
| `components/recorder/ItemAnswer.tsx` | One item: step guide, text card, recording card |
| `components/recorder/StepGuide.tsx` | Read, Record, Submit |
| `components/ui/ProgressBar.tsx` | The one progress bar |
| `components/ui/Skeleton.tsx` | Delayed loading placeholder |
| `components/ui/Explainer.tsx` | Closed row of plain definitions |
| `app/**/layout.tsx` | Tab titles |
| `tests/e2e/redesign.spec.ts`, `tests/e2e/orb.spec.ts` | New behaviour |

---

### Task 1: Depth and motion

**Files:** Modify `app/globals.css`, `components/ui/{Card,Button,Segmented,TopBar,Screen}.tsx`, `components/results/{ScoreSection,MeasureGrid,ResultsShell}.tsx`, `components/research/ReportTable.tsx`, `components/sessions/SessionCard.tsx`, `tests/e2e/layout.ts`, `tests/e2e/contrast.ts`. Test `tests/e2e/redesign.spec.ts`.

**Interfaces:** Produces utilities `shadow-card`, `shadow-raised`, `shadow-bar`, `shadow-primary`, classes `rise` and `lift`, variant `short:` (width from 40rem and height up to 499px), CSS variable `--wash-peak`.

- [ ] Write failing tests: a card has a box shadow in light and dark; `body` has a background image; with motion allowed `main > div` has animation name `rise`, with reduced motion `none`.

```ts
await expect(page.getByTestId("card")).not.toHaveCSS("box-shadow", "none");
await expect(page.locator("body")).toHaveCSS("background-image", /gradient/);
await expect(page.locator("main > div")).toHaveCSS("animation-name", "rise");
```

- [ ] Run `npx playwright test redesign.spec.ts --project=chromium`. Expected: FAIL.
- [ ] Add `:root` tokens `--elev-card`, `--elev-raised`, `--elev-bar`, `--elev-primary`, `--wash-peak`, light and dark (dark adds `inset 0 1px 0 rgba(255,255,255,0.07)`); map them in `@theme inline` as `--shadow-*`. Body: `background-image: linear-gradient(180deg, var(--wash-peak), transparent 480px)`. `rise` 250 ms from `opacity 0, translateY(8px)`. `lift` only under `@media (hover: hover)`, 2 px.
- [ ] Apply `shadow-card` to every `bg-card` surface.
- [ ] `lowContrast` paints `--wash-peak` right after the body colour. `box()` first awaits finite animations.
- [ ] Run the new tests, `layout.spec.ts` and the contrast tests. Expected: PASS.

### Task 2: Voice orb

**Files:** Create `components/orb/{VoiceOrb.tsx,scene.ts,useOrbAllowed.ts}`. Modify `package.json`, `app/page.tsx`, `components/ui/Screen.tsx`, `components/recorder/RecordPanel.tsx`, `playwright.config.ts`. Test `tests/e2e/orb.spec.ts`.

**Interfaces:**

```ts
// scene.ts
export interface OrbScene { draw(seconds: number, level: number, turn: number): void; resize(size: number, ratio: number): void; dispose(): void }
export function createOrbScene(canvas: HTMLCanvasElement): OrbScene;
// VoiceOrb.tsx
interface VoiceOrbProps { read?: (() => number) | null; turning?: boolean; className: string; fallback: ReactNode }
// Root element: data-testid="voice-orb", data-mode="3d" | "plain", aria-hidden.
// Screen gains `visual?: ReactNode`, drawn above the title of a centred card.
```

- [ ] `npm install --save-exact three@0.187.0` and `npm install --save-dev --save-exact @types/three@0.187.0`.
- [ ] Write failing tests in `orb.spec.ts` (project args add `--enable-unsafe-swiftshader`):
  1. sign in and record show `data-mode="3d"` with one canvas;
  2. without WebGL (`getContext` returns null for `webgl*`) mode is `plain`, record still works;
  3. reduced motion gives `plain`, also when switched on after load;
  4. during recording `AnalyserNode.getFloatTimeDomainData` is called more than 5 times and mode stays `3d`;
  5. `WEBGL_lose_context.loseContext()` gives `plain`;
  6. 20 round trips between record and sessions log no WebGL warning;
  7. leaving while the 3D chunk is held back raises no page error;
  8. `/research` and `/sessions` opened directly request no script containing `WebGLRenderer`; on `/` those scripts sum to at most `150 * 1024` bytes gzipped.
- [ ] Run them. Expected: FAIL.
- [ ] `useOrbAllowed`: false when `(prefers-reduced-motion: reduce)` or no `webgl2` context.
- [ ] `scene.ts`: one `IcosahedronGeometry(1, 24)` with a `ShaderMaterial`: vertex ripple of sines scaled `0.05 + level * 0.28` plus 2% breathing; fragment mixes `#0071e3` to `#7d5fff` with a rim light and includes `colorspace_fragment`. Transparent background. `dispose` also calls `forceContextLoss`.
- [ ] `VoiceOrb`: import the scene after `requestIdleCallback` (200 ms timer where missing); ignore the result if unmounted; frame loop stops when `document.hidden` or off screen (`IntersectionObserver`); pixel ratio `min(devicePixelRatio, 2)`; level `min(1, read() * 2)` smoothed by 0.18 per frame; a lost context or failed import sets `plain`.
- [ ] Sign in: orb 120 px (72 px under `short:`), fallback a still gradient circle. Record card: orb 140 px, 180 px from `sm`, 72 px under `short:`, fallback `LevelMeter`; `turning` while checking.
- [ ] Run `orb.spec.ts` and the existing recording tests. Expected: PASS.

### Task 3: Record screen guidance and short screens

**Files:** Create `components/recorder/{ItemAnswer.tsx,StepGuide.tsx}`, `components/ui/ProgressBar.tsx`. Modify `components/recorder/RecordPanel.tsx`, `app/attempts/[attemptId]/record/page.tsx`, `components/ui/TopBar.tsx`. Test `redesign.spec.ts`.

**Interfaces:**

```ts
export function ProgressBar(p: { value: number; max: number; label: string; className?: string }): JSX.Element;
export function StepGuide(p: { step: PanelState["name"] }): JSX.Element; // ol aria-label="Steps"
export function ItemAnswer(p: { text: string; onSubmit: SaveTake }): JSX.Element; // owns useRecorder, keyed by position
export function RecordPanel(p: { recorder: ReturnType<typeof useRecorder> }): JSX.Element;
```

- [ ] Write failing tests: items with `aria-current="step"` are `["1 Read","2 Record"]` when ready, `["2 Record"]` when recording, `["3 Submit"]` with an answer ready; hint reads "Tap to start" then "Tap to stop"; at 740 by 360 and 390 by 667 the Record button's bottom is within the viewport and its top at or below 0.
- [ ] Run. Expected: FAIL.
- [ ] Implement. Processing keeps "2 Record"; saving keeps "3 Submit". Current steps use a filled number and bold label. Short screens: top bar 48 px, tighter spacing, two columns, no minimum card height.
- [ ] Run `redesign.spec.ts`, `layout.spec.ts`, `record.spec.ts`, `focus.spec.ts`, `qa.spec.ts`. Expected: PASS.

### Task 4: Loading placeholders and progress

**Files:** Create `components/ui/Skeleton.tsx`. Modify `components/{Guard,AttemptGate}.tsx`, `components/results/{SessionSummary,ItemDetail}.tsx`, `components/sessions/SessionCard.tsx`, `app/sessions/page.tsx`, `app/attempts/[attemptId]/page.tsx`, `app/page.tsx`, `tests/e2e/helpers.ts`. Test `redesign.spec.ts`.

**Interfaces:** `PageSkeleton()` renders nothing for 150 ms, then `role="status"` with the name "Loading". `SessionCard` gains `featured: boolean`.

- [ ] Write failing tests:
  1. while another tab holds a write on `profiles` for 1.5 s, `/sessions` shows status "Loading", then the cards;
  2. every session card has a progressbar; exactly one has the filled button: the first in progress, else the first not started;
  3. the waiting screen shows "Simulated" and a progressbar whose value grows with `page.clock`;
  4. sign in shows "Records answers." and, for Researcher, "Reads the agreement report.".
- [ ] Run. Expected: FAIL.
- [ ] Implement. Waiting value is `min(now - submittedAt, COMPLETE_MS)`, label "Simulated analysis progress". `completeSession` waits for `score-region` instead of the text "Simulated".
- [ ] Run all Chromium tests. Expected: PASS.

### Task 5: Explanations and tab titles

**Files:** Create `components/ui/Explainer.tsx`, `app/{consent,sessions,research}/layout.tsx`, `app/attempts/[attemptId]/layout.tsx`, `app/attempts/[attemptId]/record/layout.tsx`, `app/attempts/[attemptId]/items/[n]/layout.tsx`. Modify `app/layout.tsx`, `app/not-found.tsx`, `components/results/ScoreSection.tsx`, `app/research/page.tsx`. Test `redesign.spec.ts`.

**Interfaces:** `Explainer(p: { terms: readonly [string, string][]; note: string })`, a `details` with summary "What do these numbers mean?".

Titles, template `%s, bigkas`: "Sign in" (default), "Before you start", "Reading sessions", "Session", "Record", "Item results", "Agreement report", "Page not found".

Results terms: Native "The score on the model's own scale." Normalized "Where that score falls between the lowest and highest sample calibration scores, from 0 to 1." Linear and Ridge "The normalized score adjusted to the human rating scale by regression, from 0 to 1." Speech rate "Syllables per second." Average pause length "Seconds." Average pitch "Hertz (Hz)." Mean intensity "Decibels (dB)." Note "All values here are simulated."

Report terms: Baseline "The normalized score before calibration." MAE "The average gap between score and human rating. Lower is closer." RMSE "Like MAE, but larger gaps count for more." Spearman "How well the scores keep the order of the ratings, from minus 1 to 1." Coverage "The share of held out items that have a score." Note "Sample data only."

- [ ] Write failing tests: each screen has its title; the explanation is closed, opens on click, and shows the first and last term.
- [ ] Run. Expected: FAIL. Implement. Run. Expected: PASS.

### Task 6: Verification and documents

**Files:** Modify `README.md`, the spec's status line.

- [ ] Extend the overflow check to 320 px on sign in, sessions, record, results and report.
- [ ] `npm run typecheck`, `npm run coverage`, `npm run test:e2e`, `npx playwright test --repeat-each=3`. Expected: all pass.
- [ ] Safari engine run of the screens without audio; screenshots at 360, 390, 740 by 360, 834, 1280 in light and dark, reviewed by eye; development server walk with no console warnings.
- [ ] One fresh reviewer checks the whole change against the spec.
