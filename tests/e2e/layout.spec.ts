import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";
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

for (const width of WIDTHS) {
  test(`sessions page is balanced at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page, "Participant");
    const heading = await box(page.getByRole("heading", { level: 1, name: "Reading sessions" }));
    const cards = page.getByTestId("card");
    await expect(cards).toHaveCount(3);
    const boxes = await Promise.all([0, 1, 2].map((i) => box(cards.nth(i))));
    const barTitle = await box(page.getByTestId("bar-title"));
    const signOut = await box(page.getByTestId("bar-action"));
    expectSame([barTitle.x, heading.x, boxes[0].x]);
    expectSame([signOut.right, Math.max(...boxes.map((b) => b.right))]);
    expectSame(boxes.map((b) => b.width));
    if (width >= 720) {
      expectSame(boxes.map((b) => b.y));
      expectSame(boxes.map((b) => b.height));
      const buttons = await Promise.all([0, 1, 2].map((i) => box(cards.nth(i).getByRole("button"))));
      expectSame(buttons.map((b) => b.y));
    } else {
      expect(boxes[1].y).toBeGreaterThan(boxes[0].bottom);
    }
    await expectNoOverflow(page);
  });
}

for (const width of WIDTHS) {
  test(`record page is balanced at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page, "Participant");
    await page.getByRole("button", { name: "Start" }).first().click();
    const heading = await box(page.getByRole("heading", { level: 1, name: "Item 1 of 10" }));
    const cards = page.getByTestId("card");
    await expect(cards).toHaveCount(2);
    const [text, controls] = await Promise.all([0, 1].map((i) => box(cards.nth(i))));
    const barTitle = await box(page.getByTestId("bar-title"));
    const signOut = await box(page.getByTestId("bar-action"));
    expectSame([barTitle.x, heading.x, text.x]);
    expectSame([signOut.right, controls.right]);
    if (width >= 900) {
      expectSame([text.y, controls.y]);
      expectSame([text.bottom, controls.bottom]);
      expect(text.width).toBeGreaterThan(controls.width);
    } else {
      expectSame([text.width, controls.width]);
      expect(controls.y).toBeGreaterThan(text.bottom);
    }
    await expectNoOverflow(page);
  });
}
