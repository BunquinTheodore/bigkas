"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { processAudio, type ProcessResult } from "@/lib/audio/process";
import { startRecording, type ActiveRecording } from "@/lib/audio/recorder";
import { MAX_RECORDING_SECONDS } from "@/lib/config";
import { panelReducer } from "@/lib/recorder-state";
import type { Source } from "@/lib/types";

export type SaveTake = (wav: ArrayBuffer, durationMs: number, source: Source) => Promise<void>;

const check = (blob: Blob): Promise<ProcessResult> =>
  processAudio(blob).catch((error: unknown) => {
    console.error("Audio could not be converted", error);
    return { ok: false, reason: "unreadable" } as const;
  });

/** Connects the recording card to the microphone, the audio checks and saving. */
export function useRecorder(save: SaveTake) {
  const [state, dispatch] = useReducer(panelReducer, { name: "ready", message: null });
  const [level, setLevel] = useState<(() => number) | null>(null);
  const active = useRef<ActiveRecording | null>(null);
  const starting = useRef(false);
  const saving = useRef(false);
  // A new number whenever a waiting microphone request is no longer wanted.
  const request = useRef(0);

  const abandonRequest = useCallback(() => {
    request.current += 1;
    starting.current = false;
  }, []);

  /** Takes the running recording, if any, so only one caller can finish it. */
  const take = useCallback(() => {
    const recording = active.current;
    active.current = null;
    setLevel(null);
    return recording;
  }, []);

  const stop = useCallback(async () => {
    const recording = take();
    if (!recording) return;
    dispatch({ type: "stop" });
    dispatch({ type: "processed", result: await check(await recording.stop()), source: "recorded" });
  }, [take]);

  const interrupt = useCallback(() => {
    take()?.cancel();
    dispatch({ type: "interrupted" });
  }, [take]);

  async function record() {
    if (starting.current || active.current) return;
    starting.current = true;
    const ticket = ++request.current;
    try {
      const recording = await startRecording(interrupt);
      // Granted too late: the speaker uploaded a file or left the item. Release the microphone.
      if (ticket !== request.current) return recording.cancel();
      active.current = recording;
      setLevel(() => recording.level);
      dispatch({ type: "record", now: Date.now() });
    } catch (error) {
      console.warn("Microphone unavailable", error);
      if (ticket === request.current) dispatch({ type: "micUnavailable" });
    } finally {
      if (ticket === request.current) starting.current = false;
    }
  }

  async function upload(file: File) {
    abandonRequest();
    dispatch({ type: "file" });
    dispatch({ type: "processed", result: await check(file), source: "uploaded" });
  }

  async function submit() {
    if (state.name !== "review" || saving.current) return;
    saving.current = true;
    dispatch({ type: "submit" });
    try {
      await save(state.wav, state.durationMs, state.source);
      dispatch({ type: "saved" });
    } catch (error) {
      console.error("The answer was not saved", error);
      dispatch({ type: "saveFailed" });
    } finally {
      saving.current = false;
    }
  }

  // The recording stops by itself at the time limit.
  useEffect(() => {
    if (state.name !== "recording") return;
    const timer = setTimeout(stop, MAX_RECORDING_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [state.name, stop]);

  // Release the microphone when the item changes or the page closes.
  useEffect(
    () => () => {
      abandonRequest();
      active.current?.cancel();
    },
    [abandonRequest],
  );

  return { state, level, record, stop, upload, submit, redo: () => dispatch({ type: "redo" }) };
}
