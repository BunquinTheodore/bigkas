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
