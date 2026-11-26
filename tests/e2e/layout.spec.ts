import { expect, test } from "@playwright/test";
import { box, expectNoOverflow, expectSame, viewWidth, WIDTHS } from "./layout";

for (const width of WIDTHS) {
  test(`sign in and consent are centred at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const view = await viewWidth(page);
    const card = await box(page.getByTestId("card"));
    expectSame([card.x, view - card.right]);
    expectSame([card.y, 900 - card.bottom], 2);
    expect(card.width).toBeLessThanOrEqual(400);
    await expectNoOverflow(page);

    await page.getByLabel("Email").fill("demo@example.com");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
    const consent = await box(page.getByTestId("card"));
    expectSame([consent.x, view - consent.right]);
    expect(consent.width).toBeLessThanOrEqual(560);
    const decline = await box(page.getByRole("button", { name: "Decline" }));
    const agree = await box(page.getByRole("button", { name: "Agree" }));
    expectSame([decline.width, agree.width]);
    expectSame([decline.y, agree.y]);
    await expectNoOverflow(page);
  });
}
