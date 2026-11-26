"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { PanelState } from "@/lib/recorder-state";

/**
 * The recording card swaps its controls between steps, which would drop keyboard focus to the
 * page. Back at the start it goes to the record button, and with an answer ready to its label.
 */
export function useStepFocus(
  step: PanelState["name"],
  start: RefObject<HTMLElement | null>,
  review: RefObject<HTMLElement | null>,
): void {
  const previous = useRef(step);

  useEffect(() => {
    const from = previous.current;
    if (from === step) return;
    previous.current = step;
    // After saving, the next item has arrived and its heading takes the focus instead.
    if (step === "ready" && from !== "saving") start.current?.focus();
    if (step === "review") review.current?.focus();
  }, [step, start, review]);
}
