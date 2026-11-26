"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";

// Kept outside the pages so the choice survives moving between the summary and the items.
let remembered: Category = "pronunciation";

/** The score category shown in the results. */
export function useCategory(): readonly [Category, (next: Category) => void] {
  const [category, setCategory] = useState(remembered);
  const choose = (next: Category) => {
    remembered = next;
    setCategory(next);
  };
  return [category, choose] as const;
}
