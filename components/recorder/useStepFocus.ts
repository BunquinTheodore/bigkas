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
    if (previous.current === step) return;
    previous.current = step;
    if (step === "ready") start.current?.focus();
    if (step === "review") review.current?.focus();
  }, [step, start, review]);
}
