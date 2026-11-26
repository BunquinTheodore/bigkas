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

test("the whole path: record, stop, review, submit, saved", () => {
  const ok = { ok: true as const, wav, durationMs: 1500 };
  const started = panelReducer({ name: "ready", message: null }, { type: "record", now: 5 });
  expect(started).toEqual({ name: "recording", startedAt: 5 });
  const processing = panelReducer(started, { type: "stop" });
  const review = panelReducer(processing, { type: "processed", source: "recorded", result: ok });
  expect(review).toMatchObject({ name: "review", source: "recorded", durationMs: 1500 });
  expect(panelReducer(review, { type: "redo" })).toEqual({ name: "ready", message: null });
  expect(panelReducer(review, { type: "file" })).toEqual({ name: "processing" });
  const sending = panelReducer(review, { type: "submit" });
  expect(panelReducer(sending, { type: "saved" })).toEqual({ name: "ready", message: null });
});

test("events that do not fit the state change nothing", () => {
  const ready: PanelState = { name: "ready", message: null };
  const processing: PanelState = { name: "processing" };
  const ignored = [
    [ready, "stop"], [ready, "interrupted"], [ready, "redo"], [ready, "submit"], [ready, "saved"],
    [ready, "saveFailed"], [recording, "file"], [recording, "submit"], [processing, "record"],
    [processing, "micUnavailable"], [saving, "redo"], [saving, "file"], [saving, "record"],
  ] as const;
  for (const [state, type] of ignored) {
    const event = type === "record" ? { type, now: 1 } : { type };
    expect(panelReducer(state, event), `${state.name} ${type}`).toBe(state);
  }
  expect(panelReducer(ready, { type: "processed", source: "uploaded", result: { ok: false, reason: "silent" } })).toBe(ready);
});
