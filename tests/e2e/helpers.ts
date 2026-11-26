import { expect, test, type Page } from "@playwright/test";
import { encodeWav } from "../../lib/audio/wav";

/** Signs in from the start page. Participants also agree to the consent notice. */
export async function signIn(page: Page, role: "Participant" | "Researcher", email = "demo@example.com") {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: role }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  if (role === "Researcher") {
    await page.waitForURL(/\/research$/);
    return;
  }
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Agree" }).click();
  await page.waitForURL(/\/sessions$/);
}

/** Playwright's WebKit build for Windows ships without Web Audio, so audio steps cannot run there. */
export async function skipWithoutWebAudio(page: Page) {
  const available = await page.evaluate(() => typeof AudioContext !== "undefined");
  test.skip(!available, "This browser build has no Web Audio. Test on a real iPhone instead.");
}

/** A short 440 Hz tone as an uploadable WAV file. */
export function toneFile(seconds = 2, peak = 0.3) {
  const rate = 16000;
  const samples = Float32Array.from(
    { length: Math.round(seconds * rate) },
    (_, i) => peak * Math.sin((2 * Math.PI * 440 * i) / rate),
  );
  return { name: "tone.wav", mimeType: "audio/wav", buffer: Buffer.from(encodeWav(samples, rate)) };
}

/** Answers every item with an upload and waits for the results. Call page.clock.install() first. */
export async function completeSession(page: Page) {
  await page.getByRole("button", { name: "Start" }).first().click();
  for (let n = 1; n <= 10; n++) {
    await expect(page.getByRole("heading", { name: `Item ${n} of 10` })).toBeVisible();
    await page.getByLabel("Upload audio file").setInputFiles(toneFile());
    await page.getByRole("button", { name: "Submit" }).click();
  }
  await expect(page.getByText("Pending")).toBeVisible();
  await page.clock.fastForward(31_000);
  await expect(page.getByText("Simulated")).toBeVisible();
}
