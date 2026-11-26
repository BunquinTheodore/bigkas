import { expect, test } from "vitest";
import { panelReducer, type PanelState } from "@/lib/recorder-state";

const wav = new ArrayBuffer(8);
const saving: PanelState = { name: "saving", wav, durationMs: 1500, source: "recorded" };
const recording: PanelState = { name: "recording", startedAt: 0 };

test("interruption and blocked microphone explain themselves", () => {
  expect(panelReducer(recording, { type: "interrupted" })).toEqual({ name: "ready", message: "Recording was interrupted. Record again." });
  expect(panelReducer({ name: "ready", message: null }, { type: "micUnavailable" }))
    .toMatchObject({ message: expect.stringContaining("You can still upload a file.") });
});
test("a second submit is ignored and a failed save keeps the take", () => {
  expect(panelReducer(saving, { type: "submit" })).toBe(saving);
  expect(panelReducer(saving, { type: "saveFailed" }))
    .toMatchObject({ name: "review", wav, message: "This item was not saved. Try Submit again." });
});
test("a rejected file returns to ready with the reason", () => {
  expect(panelReducer({ name: "processing" }, { type: "processed", source: "uploaded", result: { ok: false, reason: "silent" } }))
    .toEqual({ name: "ready", message: "No sound was detected. Try again." });
});
