// The calm depth redesign: docs/superpowers/specs/2026-11-26-bigkas-redesign-design.md.
import { expect, test, type Page } from "@playwright/test";
import { answerAll, completeSession, signIn } from "./helpers";
import { box, expectNoOverflow } from "./layout";

async function openFirstItem(page: Page) {
  await signIn(page, "Participant");
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page.getByRole("heading", { name: "Item 1 of 10" })).toBeVisible();
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`cards have depth over a soft wash in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.getByTestId("card")).not.toHaveCSS("box-shadow", "none");
    await expect(page.locator("body")).toHaveCSS("background-image", /gradient/);
  });
}

test("page content rises in once, and stays still with reduced motion", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main > div")).toHaveCSS("animation-name", "rise");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("main > div")).toHaveCSS("animation-name", "none");
});

test("the step guide and the hint follow the answer", async ({ page }) => {
  await openFirstItem(page);
  const current = page.getByRole("list", { name: "Steps" }).locator("[aria-current='step']");
  await expect(current).toHaveText(["1 Read", "2 Record"]);
  await expect(page.getByText("Tap to start")).toBeVisible();
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByText("Tap to stop")).toBeVisible();
  await expect(current).toHaveText(["2 Record"]);
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(current).toHaveText(["3 Submit"]);
});

for (const [width, height] of [[740, 360], [390, 667]] as const) {
  test(`the record button needs no scrolling at ${width} by ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openFirstItem(page);
    const record = await box(page.getByRole("button", { name: "Record" }));
    expect(record.y).toBeGreaterThanOrEqual(0);
    expect(record.bottom).toBeLessThanOrEqual(height);
  });
}

const FILLED = "rgb(0, 113, 227)";

test("a slow load shows placeholders, then the page", async ({ page, context }) => {
  await signIn(page, "Participant");
  const other = await context.newPage();
  await other.goto("/");
  // Another tab keeps a write open, so reading the profile has to wait.
  await other.evaluate(
    () =>
      new Promise<void>((resolve) => {
        indexedDB.open("bigkas").onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const store = db.transaction("profiles", "readwrite").objectStore("profiles");
          const end = Date.now() + 4000;
          const hold = () => {
            if (Date.now() < end) store.get("hold").onsuccess = hold;
          };
          hold();
          resolve();
        };
      }),
  );
  await page.reload();
  const loading = page.getByRole("status", { name: "Loading" });
  await expect(loading).toBeVisible();
  await expect(page.getByRole("button", { name: "Start" }).first()).toBeVisible({ timeout: 10_000 });
  await expect(loading).toHaveCount(0);
});

test("session cards show progress and fill the button to use next", async ({ page }) => {
  await signIn(page, "Participant");
  const button = (n: number) => page.getByTestId("card").nth(n).getByRole("button");
  await expect(page.getByRole("progressbar")).toHaveCount(3);
  await expect(button(0)).toHaveCSS("background-color", FILLED);
  await expect(button(1)).not.toHaveCSS("background-color", FILLED);
  await button(1).click();
  await expect(page.getByRole("heading", { name: "Item 1 of 10" })).toBeVisible();
  await page.getByRole("link", { name: "Sessions" }).click();
  await expect(page.getByRole("heading", { name: "Reading sessions" })).toBeVisible();
  await expect(button(1)).toHaveCSS("background-color", FILLED);
  await expect(button(0)).not.toHaveCSS("background-color", FILLED);
});

test("the waiting screen shows simulated progress", async ({ page }) => {
  await page.clock.install();
  await signIn(page, "Participant");
  await answerAll(page);
  const bar = page.getByRole("progressbar", { name: "Simulated analysis progress" });
  const value = async () => Number(await bar.getAttribute("aria-valuenow"));
  await expect(page.getByText("Simulated", { exact: true })).toBeVisible();
  const first = await value();
  await page.clock.fastForward(15_000);
  await expect.poll(value).toBeGreaterThan(first + 10_000);
});

test("sign in explains the chosen role", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Records answers.")).toBeVisible();
  await page.getByRole("button", { name: "Researcher" }).click();
  await expect(page.getByText("Reads the agreement report.")).toBeVisible();
});

test("each screen has its own tab title", async ({ page }) => {
  await page.clock.install();
  const titled = (name: string) => expect(page).toHaveTitle(`${name}, bigkas`);
  await page.goto("/no-such-page");
  await titled("Page not found");
  await page.goto("/");
  await titled("Sign in");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await titled("Before you start");
  await signIn(page, "Participant");
  await titled("Reading sessions");
  await page.getByRole("button", { name: "Start" }).nth(1).click();
  await titled("Record");
  await page.getByRole("link", { name: "Sessions" }).click();
  await completeSession(page);
  await titled("Session");
  await page.getByRole("link", { name: /^Item 1\b/ }).click();
  await titled("Item results");
  await signIn(page, "Researcher", "r@example.com");
  await titled("Agreement report");
});

test("the results and the report explain their numbers on request", async ({ page }) => {
  await page.clock.install();
  await signIn(page, "Participant");
  await completeSession(page);
  const row = page.getByText("What do these numbers mean?");
  const native = page.getByText("The score on the model's own scale.");
  await expect(native).toBeHidden();
  await row.click();
  await expect(native).toBeVisible();
  await expect(page.getByText("Decibels (dB).")).toBeVisible();
  await signIn(page, "Researcher", "r@example.com");
  const baseline = page.getByText("The normalized score before calibration.");
  await expect(baseline).toBeHidden();
  await row.click();
  await expect(baseline).toBeVisible();
  await expect(page.getByText("The share of held out items that have a score.")).toBeVisible();
});

test("nothing overlaps or scrolls sideways on a very small screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.install();
  await page.goto("/");
  await expectNoOverflow(page);
  await signIn(page, "Participant");
  await expectNoOverflow(page);
  await completeSession(page);
  await page.getByText("What do these numbers mean?").click();
  await expectNoOverflow(page);
  await page.goto("/sessions");
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page.getByRole("list", { name: "Steps" })).toBeVisible();
  await expectNoOverflow(page);
  await signIn(page, "Researcher", "r@example.com");
  await page.getByText("What do these numbers mean?").click();
  await expectNoOverflow(page);
});

test("on an upright phone the upload choice is also on the first screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await openFirstItem(page);
  const upload = await box(page.getByText("Upload audio file"));
  expect(upload.bottom).toBeLessThanOrEqual(667);
});

test("an openable card deepens its shadow under the pointer", async ({ page }) => {
  await signIn(page, "Participant");
  const card = page.getByTestId("card").first();
  await expect(card.getByRole("button")).toBeVisible();
  const shadow = () => card.evaluate((element) => getComputedStyle(element).boxShadow);
  const resting = await shadow();
  await card.hover();
  await expect.poll(shadow).not.toBe(resting);
});
