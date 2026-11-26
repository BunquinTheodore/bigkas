import type { Page } from "@playwright/test";
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

/** A short 440 Hz tone as an uploadable WAV file. */
export function toneFile(seconds = 2, peak = 0.3) {
  const rate = 16000;
  const samples = Float32Array.from(
    { length: Math.round(seconds * rate) },
    (_, i) => peak * Math.sin((2 * Math.PI * 440 * i) / rate),
  );
  return { name: "tone.wav", mimeType: "audio/wav", buffer: Buffer.from(encodeWav(samples, rate)) };
}
