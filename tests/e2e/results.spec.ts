import { expect, test } from "@playwright/test";
import { signIn, skipWithoutWebAudio, toneFile } from "./helpers";

test("ten answers move from Pending to results @upload", async ({ page }) => {
  await page.clock.install();
  await signIn(page, "Participant");
  await skipWithoutWebAudio(page);
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
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Item 2 of 10" })).toBeVisible();
});
test("an unknown attempt explains itself", async ({ page }) => {
  await signIn(page, "Participant");
  await page.goto("/attempts/not-a-real-id");
  await expect(page.getByText("This session is not in this profile's demo data.")).toBeVisible();
});
