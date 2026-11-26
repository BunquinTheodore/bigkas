"use client";

import { useRef, type Ref } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useNow } from "@/components/useNow";
import { useObjectUrl } from "@/components/useObjectUrl";
import { usePlayback } from "@/components/usePlayback";
import { MAX_RECORDING_SECONDS } from "@/lib/config";
import { LevelMeter } from "./LevelMeter";
import { useRecorder, type SaveTake } from "./useRecorder";
import { useStepFocus } from "./useStepFocus";

const clock = (seconds: number) => `0:${String(Math.floor(seconds)).padStart(2, "0")}`;

interface RecordButtonProps {
  ref: Ref<HTMLButtonElement>;
  recording: boolean;
  onClick: () => void;
}

function RecordButton({ ref, recording, onClick }: RecordButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={recording ? "Stop" : "Record"}
      onClick={onClick}
      className="grid size-[84px] place-items-center rounded-full border-4 border-secondary/60 transition active:scale-95"
    >
      <span className={`bg-record ${recording ? "size-9 rounded-lg" : "size-16 rounded-full"}`} />
    </button>
  );
}

function Timer({ startedAt }: { startedAt: number | null }) {
  const now = useNow(250);
  const elapsed = startedAt === null ? 0 : Math.min(MAX_RECORDING_SECONDS, Math.max(0, (now - startedAt) / 1000));
  return (
    <p className="text-secondary tabular-nums">
      {clock(elapsed)} / {clock(MAX_RECORDING_SECONDS)}
    </p>
  );
}

function UploadButton({ onFile }: { onFile: (file: File) => void }) {
  return (
    <label className={buttonClass("plain", "cursor-pointer focus-within:outline-3 focus-within:outline-tint-text")}>
      Upload audio file
      <input
        type="file"
        accept="audio/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

/** The recording card: record or upload, then play, redo or submit. */
export function RecordPanel({ onSubmit }: { onSubmit: SaveTake }) {
  const { state, level, record, stop, upload, submit, redo } = useRecorder(onSubmit);
  const take = state.name === "review" || state.name === "saving" ? state : null;
  const url = useObjectUrl(take?.wav ?? null);
  const play = usePlayback(url);
  const message = state.name === "ready" || state.name === "review" ? state.message : null;
  const recordButton = useRef<HTMLButtonElement>(null);
  const readyText = useRef<HTMLParagraphElement>(null);
  useStepFocus(state.name, recordButton, readyText);

  return (
    <Card className="flex min-h-[320px] flex-col items-center justify-center gap-4">
      <LevelMeter read={level} />
      {take ? (
        <>
          <p ref={readyText} tabIndex={-1} className="text-secondary">
            Answer ready, {clock(take.durationMs / 1000)}
          </p>
          <div className="grid w-full grid-cols-3 gap-2">
            <Button className="px-2!" disabled={!url} onClick={play}>
              Play
            </Button>
            <Button className="px-2!" disabled={state.name === "saving"} onClick={redo}>
              Redo
            </Button>
            <Button variant="primary" className="px-2!" disabled={state.name === "saving"} onClick={submit}>
              Submit
            </Button>
          </div>
        </>
      ) : state.name === "processing" ? (
        <p role="status" className="grid min-h-[84px] place-items-center text-secondary">
          Checking the audio.
        </p>
      ) : (
        <>
          <RecordButton
            ref={recordButton}
            recording={state.name === "recording"}
            onClick={state.name === "recording" ? stop : record}
          />
          <Timer startedAt={state.name === "recording" ? state.startedAt : null} />
          {state.name === "ready" && <UploadButton onFile={upload} />}
        </>
      )}
      {message && (
        <p role="alert" className="text-center text-[15px] text-danger">
          {message}
        </p>
      )}
    </Card>
  );
}
