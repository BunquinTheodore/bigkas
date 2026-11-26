// Defects found in QA on 26 November 2026. Each test fails on the version that had the defect.
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { MAX_RECORDING_SECONDS } from "../../lib/config";
import { lowContrast } from "./contrast";
import { completeSession, signIn, skipWithoutWebAudio, toneFile } from "./helpers";
import { expectNoOverflow } from "./layout";

type Hooks = Window & { __fail?: boolean };

/** Makes the next writes to one store fail while `window.__fail` is set. */
async function breakWrites(page: Page, storeName: string) {
  await page.addInitScript((name) => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if (this.name === name && (window as unknown as Hooks).__fail) {
        throw new DOMException("Full", "QuotaExceededError");
      }
      return original.apply(this, args);
    };
  }, storeName);
}

const setFailing = (page: Page, value: boolean) =>
  page.evaluate((next) => ((window as unknown as Hooks).__fail = next), value);

async function openFirstItem(page: Page) {
  await signIn(page, "Participant");
  await skipWithoutWebAudio(page);
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page.getByRole("heading", { name: "Item 1 of 10" })).toBeVisible();
}

/** Erases the demo data from a second tab, as someone might while this one stays open. */
async function eraseInAnotherTab(context: BrowserContext) {
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "Clear demo data" }).click();
  await other.getByRole("button", { name: "Erase" }).click();
  await expect(other.getByText("Demo data erased.")).toBeVisible();
  await other.close();
}

test("a recording whose stop timer runs late is kept, not refused", async ({ page }) => {
  test.setTimeout(90_000);
  // A slow phone: the timer that stops the recording at the limit fires 2 s late.
  await page.addInitScript((limit) => {
    const original = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...rest: unknown[]) =>
      original(handler, delay === limit ? limit + 2000 : delay, ...rest)) as typeof window.setTimeout;
  }, MAX_RECORDING_SECONDS * 1000);
  await openFirstItem(page);
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Answer ready, 0:30")).toBeVisible();
});

test("a consent that cannot be saved says so", async ({ page }) => {
  await breakWrites(page, "profiles");
  await page.goto("/");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I am 18 or older").check();
  await setFailing(page, true);
  await page.getByRole("button", { name: "Agree" }).click();
  await expect(page.getByText("Your consent was not saved. Try Agree again.")).toBeVisible();
  await setFailing(page, false);
  await page.getByRole("button", { name: "Agree" }).click();
  await expect(page).toHaveURL(/\/sessions$/);
});

test("a failed sign in can be tried again", async ({ page }) => {
  await breakWrites(page, "profiles");
  await page.goto("/");
  await page.getByLabel("Email").fill("demo@example.com");
  await setFailing(page, true);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Sign in did not work.")).toBeVisible();
  await setFailing(page, false);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
});

test("a session that cannot be read is not called missing", async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (...args: Parameters<typeof original>) {
      if (this.name === "attempts" && sessionStorage.getItem("fail-read")) {
        throw new DOMException("Lost", "UnknownError");
      }
      return original.apply(this, args);
    };
  });
  await openFirstItem(page);
  await page.evaluate(() => sessionStorage.setItem("fail-read", "1"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "This session could not load" })).toBeVisible();
  await page.evaluate(() => sessionStorage.removeItem("fail-read"));
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByRole("heading", { name: "Item 1 of 10" })).toBeVisible();
});

test("data erased in another tab ends the session instead of retrying forever", async ({ page, context }) => {
  await openFirstItem(page);
  await eraseInAnotherTab(context);
  await page.getByLabel("Upload audio file").setInputFiles(toneFile());
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("heading", { name: "Session not found" })).toBeVisible();
});

test("agreeing after the data was erased elsewhere returns to sign in", async ({ page, context }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
  await eraseInAnotherTab(context);
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Agree" }).click();
  await expect(page).toHaveURL("/");
});

test("starting a session after the data was erased elsewhere saves nothing", async ({ page, context }) => {
  await signIn(page, "Participant");
  await eraseInAnotherTab(context);
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page).toHaveURL("/");
  await signIn(page, "Participant");
  await expect(page.getByText("Not started")).toHaveCount(3);
});

test("an unknown address offers a way back", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Go to sign in" }).click();
  await expect(page).toHaveURL("/");
});

test("the tab has an icon", async ({ page }) => {
  await page.goto("/");
  const icon = page.locator('head link[rel="icon"]');
  await expect(icon).toHaveCount(1);
  const response = await page.request.get((await icon.getAttribute("href")) as string);
  expect(response.ok()).toBe(true);
});

test("the sessions page shows who is signed in, even a long address", async ({ page }) => {
  const email = "averylongparticipantaddresswithoutanybreaks0123456789@example-university.edu";
  await page.setViewportSize({ width: 320, height: 640 });
  await signIn(page, "Participant", email);
  await expect(page.getByRole("main").getByText(email)).toBeVisible();
  await expectNoOverflow(page);
});

test("the chosen category stays while moving between results", async ({ page }) => {
  await page.clock.install();
  await signIn(page, "Participant");
  await skipWithoutWebAudio(page);
  await completeSession(page);
  const fluency = page.getByRole("button", { name: "Fluency" });
  await fluency.click();
  await page.getByRole("link", { name: /^Item 1\b/ }).click();
  await expect(page.getByRole("heading", { name: "Item 1 of 10" })).toBeVisible();
  await expect(fluency).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Item 2 of 10" })).toBeVisible();
  await expect(fluency).toHaveAttribute("aria-pressed", "true");
});

test("keyboard order follows what is on screen in the results", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1280, height: 800 });
  await signIn(page, "Participant");
  await skipWithoutWebAudio(page);
  await completeSession(page);
  // Wide: the item list is on the left, so it comes first.
  await page.getByRole("link", { name: /^Item 10\b/ }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Pronunciation" })).toBeFocused();
  // Narrow: the scores are on top, so they come first.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(async () => {
    await page.getByRole("button", { name: "Prosody" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Summary", exact: true })).toBeFocused({ timeout: 500 });
  }).toPass();
});

test("keyboard focus is not lost while answering", async ({ page }) => {
  await openFirstItem(page);
  const record = page.getByRole("button", { name: "Record" });
  await record.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Stop" })).toBeFocused();
  await page.waitForTimeout(1500);
  await page.keyboard.press("Enter");
  await expect(page.getByText(/^Answer ready/)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Play" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter"); // Redo
  await expect(record).toBeFocused();
  await page.getByLabel("Upload audio file").setInputFiles(toneFile(2, 0));
  await expect(page.getByText("No sound was detected. Try again.")).toBeVisible();
  await expect(record).toBeFocused();
  await page.getByLabel("Upload audio file").setInputFiles(toneFile());
  await page.getByRole("button", { name: "Submit" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Item 2 of 10" })).toBeFocused();
});

test("clearing demo data keeps keyboard focus on its buttons", async ({ page }) => {
  await page.goto("/");
  const clear = page.getByRole("button", { name: "Clear demo data" });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(clear).toBeFocused();
});

test("the review buttons use their narrow padding", async ({ page }) => {
  await openFirstItem(page);
  await page.getByLabel("Upload audio file").setInputFiles(toneFile());
  for (const name of ["Play", "Redo", "Submit"]) {
    await expect(page.getByRole("button", { name })).toHaveCSS("padding-left", "8px");
  }
});

for (const scheme of ["light", "dark"] as const) {
  test(`text is readable on every screen in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.clock.install();
    const check = async (screen: string) => expect(await lowContrast(page), screen).toEqual([]);
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await check("not found");
    await page.goto("/");
    await page.getByRole("button", { name: "Clear demo data" }).click();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await check("erase question");
    await page.getByLabel("Email").fill("demo@example.com");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
    await check("consent");
    await signIn(page, "Participant");
    await skipWithoutWebAudio(page);
    await expect(page.getByRole("button", { name: "Start" })).toHaveCount(3);
    await check("sessions");
    await page.getByRole("button", { name: "Start" }).first().click();
    for (let n = 1; n <= 10; n++) {
      await expect(page.getByRole("heading", { name: `Item ${n} of 10` })).toBeVisible();
      if (n === 1) await check("record");
      await page.getByLabel("Upload audio file").setInputFiles(toneFile());
      await expect(page.getByRole("button", { name: "Play" })).toBeEnabled();
      if (n === 1) await check("review");
      await page.getByRole("button", { name: "Submit" }).click();
    }
    await expect(page.getByText("Pending")).toBeVisible();
    await check("pending");
    await page.clock.fastForward(31_000);
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await check("summary");
    await page.getByRole("link", { name: /^Item 1\b/ }).click();
    await expect(page.getByRole("button", { name: "Play answer" })).toBeEnabled();
    await check("item");
    await signIn(page, "Researcher", "r@example.com");
    await expect(page.getByTestId("report")).toBeVisible();
    await check("report");
  });
}
