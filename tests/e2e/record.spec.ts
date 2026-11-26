import { expect, test } from "@playwright/test";
import { signIn, skipWithoutWebAudio, toneFile } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, "Participant");
  await skipWithoutWebAudio(page);
  await page.getByRole("button", { name: "Start" }).first().click();
  await expect(page.getByRole("heading", { name: "Item 1 of 10" })).toBeVisible();
});
test("record with the microphone and submit", async ({ page }) => {
  await page.getByRole("button", { name: "Record" }).click();
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeEnabled();
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
