// What the recording card is doing. Pure, so every path can be tested.
import { REJECTION_MESSAGES, type ProcessResult } from "./audio/process";
import type { Source } from "./types";

type Take = { wav: ArrayBuffer; durationMs: number; source: Source };

export type PanelState =
  | { name: "ready"; message: string | null }
  | { name: "recording"; startedAt: number }
  | { name: "processing" }
  | ({ name: "review"; message: string | null } & Take)
  | ({ name: "saving" } & Take);

export type PanelEvent =
  | { type: "record"; now: number }
  | { type: "stop" }
  | { type: "file" }
  | { type: "processed"; result: ProcessResult; source: Source }
  | { type: "interrupted" }
  | { type: "micUnavailable" }
  | { type: "redo" }
  | { type: "submit" }
  | { type: "saved" }
  | { type: "saveFailed" };

export const MIC_MESSAGE =
  "The microphone is unavailable. Allow access, or open this page in Safari or Chrome. You can still upload a file.";
export const INTERRUPTED_MESSAGE = "Recording was interrupted. Record again.";
export const SAVE_FAILED_MESSAGE = "This item was not saved. Try Submit again.";

const ready = (message: string | null = null): PanelState => ({ name: "ready", message });

function afterProcessing(result: ProcessResult, source: Source): PanelState {
  if (!result.ok) return ready(REJECTION_MESSAGES[result.reason]);
  return { name: "review", wav: result.wav, durationMs: result.durationMs, source, message: null };
}

/** Events that do not fit the current state leave it unchanged, so double taps are harmless. */
export function panelReducer(state: PanelState, event: PanelEvent): PanelState {
  switch (event.type) {
    case "record":
      return state.name === "ready" ? { name: "recording", startedAt: event.now } : state;
    case "stop":
      return state.name === "recording" ? { name: "processing" } : state;
    case "file":
      return state.name === "ready" || state.name === "review" ? { name: "processing" } : state;
    case "processed":
      return state.name === "processing" ? afterProcessing(event.result, event.source) : state;
    case "interrupted":
      return state.name === "recording" ? ready(INTERRUPTED_MESSAGE) : state;
    case "micUnavailable":
      return state.name === "ready" || state.name === "recording" ? ready(MIC_MESSAGE) : state;
    case "redo":
      return state.name === "review" ? ready() : state;
    case "submit":
      return state.name === "review" ? { ...state, name: "saving" } : state;
    case "saved":
      return state.name === "saving" ? ready() : state;
    case "saveFailed":
      return state.name === "saving" ? { ...state, name: "review", message: SAVE_FAILED_MESSAGE } : state;
  }
}
