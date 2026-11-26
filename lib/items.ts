import { ITEM_BANK } from "../data/items";
import { ITEMS_PER_ATTEMPT } from "./config";
import type { ReadingItem } from "./types";

/** Draws the items for one attempt without repeats. */
export function drawItemIds(rng: () => number): string[] {
  const pool = ITEM_BANK.map((item) => item.id);
  return Array.from({ length: ITEMS_PER_ATTEMPT }, () => {
    const [id] = pool.splice(Math.floor(rng() * pool.length), 1);
    return id;
  });
}

export function getItem(id: string): ReadingItem {
  const item = ITEM_BANK.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown reading item: ${id}`);
  return item;
}
