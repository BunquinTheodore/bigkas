import { expect, test } from "@playwright/test";

test("participant signs in, consents and reaches reading sessions", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Participant" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agree" })).toBeDisabled();
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Agree" }).click();
  await expect(page).toHaveURL(/\/sessions$/);
});

test("a protected page sends visitors to sign in, and declining does too", async ({ page }) => {
  await page.goto("/consent");
  await expect(page).toHaveURL("/");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page).toHaveURL("/");
});

test("clear demo data asks first, then forgets the profile", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Agree" }).click();
  await page.goto("/");
  await page.getByRole("button", { name: "Clear demo data" }).click();
  await expect(page.getByText("Erase everything, including unfinished sessions?")).toBeVisible();
  await page.getByRole("button", { name: "Erase" }).click();
  await expect(page.getByText("Demo data erased.")).toBeVisible();
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
});
