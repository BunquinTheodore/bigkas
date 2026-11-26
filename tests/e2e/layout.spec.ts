import { expect, test } from "@playwright/test";
import { completeSession, signIn } from "./helpers";
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

for (const width of WIDTHS) {
  test(`results are balanced at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install();
    await signIn(page, "Participant");
    await completeSession(page);
    const heading = await box(page.getByRole("heading", { level: 1 }));
    const list = await box(page.getByTestId("item-list"));
    const scores = await box(page.getByTestId("score-region"));
    const barTitle = await box(page.getByTestId("bar-title"));
    const signOut = await box(page.getByTestId("bar-action"));
    expectSame([barTitle.x, heading.x, list.x]);
    expectSame([signOut.right, scores.right]);
    if (width >= 900) {
      expectSame([list.y, scores.y]);
      expectSame([list.width, 240]);
    } else {
      expectSame([list.width, scores.width]);
      expect(list.y).toBeGreaterThan(scores.bottom);
    }
    const tiles = page.getByTestId("measure");
    await expect(tiles).toHaveCount(4);
    const boxes = await Promise.all([0, 1, 2, 3].map((i) => box(tiles.nth(i))));
    expectSame(boxes.map((b) => b.width));
    expectSame(width >= 640 ? boxes.map((b) => b.y) : [boxes[0].y, boxes[1].y]);
    if (width >= 640) {
      const columns = page.locator("thead th");
      const values = await Promise.all([1, 2, 3, 4].map((i) => box(columns.nth(i))));
      expectSame(values.map((c) => c.width));
    }
    await expectNoOverflow(page);

    await page.getByRole("link", { name: /^Item 1\b/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Item 1 of 10" })).toBeVisible();
    const previous = await box(page.getByTestId("previous"));
    const next = await box(page.getByTestId("next"));
    expectSame([previous.width, next.width]);
    expectSame([previous.y, next.y]);
    if (width >= 640) {
      const columns = page.locator("thead th");
      const values = await Promise.all([1, 2, 3, 4].map((i) => box(columns.nth(i))));
      expectSame(values.map((c) => c.width));
    }
    await expectNoOverflow(page);
  });
}

for (const width of WIDTHS) {
  test(`agreement report is aligned at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page, "Researcher");
    const heading = await box(page.getByRole("heading", { level: 1 }));
    const report = await box(page.getByTestId("report"));
    const barTitle = await box(page.getByTestId("bar-title"));
    const signOut = await box(page.getByTestId("bar-action"));
    expectSame([barTitle.x, heading.x, report.x]);
    expectSame([signOut.right, report.right]);
    await expectNoOverflow(page);
    await page.getByRole("button", { name: "Prosody" }).click();
    await expectNoOverflow(page);
  });
}
