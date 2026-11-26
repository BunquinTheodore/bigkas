// Shared layout checks: no sideways scroll, nothing clipped, shared edges.
import { expect, type Locator, type Page } from "@playwright/test";

export const WIDTHS = [360, 390, 834, 1280, 1440] as const;

export async function expectNoOverflow(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const issues: string[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth) {
      issues.push(`page scrolls sideways: ${root.scrollWidth} > ${root.clientWidth}`);
    }
    for (const el of document.querySelectorAll<HTMLElement>("button, .pill, th, td, h1, h2, h3, a, label, p")) {
      const visible = el.offsetParent !== null && getComputedStyle(el).display !== "inline";
      if (visible && el.scrollWidth > el.clientWidth + 1) {
        issues.push(`clipped ${el.tagName}: ${el.textContent?.trim().slice(0, 40)}`);
      }
    }
    return issues;
  });
  expect(problems).toEqual([]);
}

export async function viewWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.clientWidth);
}

export async function box(locator: Locator) {
  await expect(locator).toBeVisible();
  // Measure after the page has finished rising into place.
  await locator.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error("Element has no box");
  return { ...bounds, right: bounds.x + bounds.width, bottom: bounds.y + bounds.height };
}

export function expectSame(values: number[], tolerance = 1): void {
  expect(Math.max(...values) - Math.min(...values), `values ${values.join(", ")}`).toBeLessThanOrEqual(tolerance);
}
