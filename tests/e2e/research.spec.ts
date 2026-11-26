import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("researcher reads the report", async ({ page }) => {
  await signIn(page, "Researcher");
  await expect(page.getByRole("heading", { name: "Agreement with human ratings" })).toBeVisible();
  await expect(page.getByText("Sample data", { exact: true })).toBeVisible();
  await expect(page.getByTestId("report").getByText("Baseline").filter({ visible: true }).first()).toBeVisible();
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
