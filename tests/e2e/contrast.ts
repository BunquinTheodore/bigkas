// Finds visible text below the WCAG AA contrast ratio, composited the way the browser paints it.
import type { Page } from "@playwright/test";

export async function lowContrast(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const paint = canvas.getContext("2d", { willReadFrequently: true })!;
    const luminance = () => {
      const [r, g, b] = [...paint.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((v) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const fill = (color: string) => {
      paint.fillStyle = color;
      paint.fillRect(0, 0, 1, 1);
    };
    const failures: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement!;
      const text = node.textContent?.trim();
      if (!text || !element.checkVisibility() || element.closest(".sr-only, :disabled, [aria-disabled='true'], script")) {
        continue;
      }
      const chain: Element[] = [];
      for (let e: Element | null = element; e; e = e.parentElement) chain.unshift(e);
      fill("#ffffff");
      chain.forEach((e) => fill(getComputedStyle(e).backgroundColor));
      const background = luminance();
      const style = getComputedStyle(element);
      fill(style.color);
      const foreground = luminance();
      const ratio = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      const size = parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) failures.push(`${ratio.toFixed(2)} "${text.slice(0, 30)}"`);
    }
    return failures;
  });
}
