import type { Page } from "@playwright/test";

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
