// The voice orb: decoration drawn with three.js, with a plain fallback.
import { gzipSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { signIn, toneFile } from "./helpers";

// Lets the headless browser draw 3D without a graphics card. Only in this file, and one test at a
// time, because drawing 3D in software is slow when many tests share one machine.
test.use({
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--enable-unsafe-swiftshader"],
  },
});
test.describe.configure({ mode: "default" });

const ORB_BUDGET = 150 * 1024;
const orb = (page: Page) => page.getByTestId("voice-orb");
const drawn = (page: Page) => expect(orb(page)).toHaveAttribute("data-mode", "3d", { timeout: 15_000 });
const plain = (page: Page) => expect(orb(page)).toHaveAttribute("data-mode", "plain");

async function openFirstItem(page: Page) {
  await signIn(page, "Participant");
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page.getByRole("heading", { name: "Item 1 of 10" })).toBeVisible();
}

/** Collects page errors and warnings, which a graphics failure would leave behind. */
function watchProblems(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /webgl/i.test(message.text())) problems.push(message.text());
  });
  return problems;
}

/** Collects the bodies of scripts that carry three.js. */
function watchThree(page: Page) {
  const found: Buffer[] = [];
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    const body = await response.body().catch(() => null);
    if (body?.includes("WebGLRenderer")) found.push(body);
  });
  return found;
}

test("the orb is drawn on sign in and on the recording card", async ({ page }) => {
  await page.goto("/");
  await drawn(page);
  await expect(orb(page).locator("canvas")).toHaveCount(1);
  await expect(orb(page)).toHaveAttribute("aria-hidden", "true");
  await openFirstItem(page);
  await drawn(page);
  await expect(page.locator("canvas")).toHaveCount(1);
});

test("without 3D support the plain version shows and recording works", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type.startsWith("webgl") ? null : Reflect.apply(original, this, [type, ...rest]);
    } as typeof original;
  });
  const problems = watchProblems(page);
  await openFirstItem(page);
  await plain(page);
  await page.getByRole("button", { name: "Record" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
  expect(problems).toEqual([]);
});

test("reduced motion shows the plain version, even when switched on later", async ({ page }) => {
  await page.goto("/");
  await drawn(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await plain(page);
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.reload();
  // Longer than the wait before the 3D code starts, so it would have appeared by now.
  await page.waitForTimeout(2000);
  await plain(page);
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await drawn(page);
});

test("the orb stays the same drawing from one item to the next", async ({ page }) => {
  await openFirstItem(page);
  await drawn(page);
  await orb(page).locator("canvas").evaluate((canvas) => canvas.setAttribute("data-first", "yes"));
  await page.getByLabel("Upload audio file").setInputFiles(toneFile());
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("heading", { name: "Item 2 of 10" })).toBeVisible();
  await expect(orb(page).locator("canvas")).toHaveAttribute("data-first", "yes");
  await expect(orb(page)).toHaveAttribute("data-mode", "3d");
});

test("the orb listens to the microphone while recording", async ({ page }) => {
  await page.addInitScript(() => {
    const original = AnalyserNode.prototype.getFloatTimeDomainData;
    const counter = window as unknown as { __reads: number };
    counter.__reads = 0;
    AnalyserNode.prototype.getFloatTimeDomainData = function (...args: Parameters<typeof original>) {
      counter.__reads += 1;
      return original.apply(this, args);
    };
  });
  await openFirstItem(page);
  await drawn(page);
  await page.getByRole("button", { name: "Record" }).click();
  const reads = () => page.evaluate(() => (window as unknown as { __reads: number }).__reads);
  await expect.poll(reads).toBeGreaterThan(5);
  await drawn(page);
});

test("a lost graphics context falls back to the plain version", async ({ page }) => {
  await page.goto("/");
  await drawn(page);
  await orb(page).locator("canvas").evaluate((canvas: HTMLCanvasElement) =>
    canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext(),
  );
  await plain(page);
});

test("many visits release the graphics context each time", async ({ page }) => {
  test.setTimeout(90_000);
  const problems = watchProblems(page);
  await openFirstItem(page);
  for (let i = 0; i < 20; i++) {
    await drawn(page);
    await page.getByRole("link", { name: "Sessions" }).click();
    await page.getByRole("button", { name: "Resume" }).click();
  }
  await drawn(page);
  expect(problems).toEqual([]);
});

test("leaving while the 3D code is still downloading raises no error", async ({ page: signedIn, context }) => {
  await signIn(signedIn, "Participant");
  // A fresh page, so the 3D code has not been loaded yet.
  const page = await context.newPage();
  const problems = watchProblems(page);
  await page.goto("/sessions");
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  let caught = false;
  await page.route("**/*.js*", async (route) => {
    const response = await route.fetch();
    if ((await response.text()).includes("WebGLRenderer")) {
      caught = true;
      await held;
    }
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page.getByRole("button", { name: "Record" })).toBeVisible();
  await expect.poll(() => caught, { timeout: 10_000 }).toBe(true);
  await plain(page);
  await page.getByRole("link", { name: "Sessions" }).click();
  await expect(page.getByRole("heading", { name: "Reading sessions" })).toBeVisible();
  release();
  await page.waitForTimeout(500);
  expect(problems).toEqual([]);
});

test("screens without an orb never download the 3D code", async ({ page, context }) => {
  await signIn(page, "Participant");
  const other = await context.newPage();
  const found = watchThree(other);
  await other.goto("/sessions", { waitUntil: "networkidle" });
  await expect(other.getByRole("button", { name: "Start" }).first()).toBeVisible();
  await other.waitForTimeout(800);
  expect(found).toHaveLength(0);
});

test("the 3D code stays within its download budget", async ({ page }) => {
  const found = watchThree(page);
  await page.goto("/");
  await drawn(page);
  await expect.poll(() => found.length).toBeGreaterThan(0);
  const size = found.reduce((sum, body) => sum + gzipSync(body, { level: 9 }).length, 0);
  console.log(`3D download: ${(size / 1024).toFixed(0)} kB compressed`);
  expect(size).toBeLessThanOrEqual(ORB_BUDGET);
});
