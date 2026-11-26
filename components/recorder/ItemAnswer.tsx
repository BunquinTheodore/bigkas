"use client";

import { Card } from "@/components/ui/Card";
import { RecordPanel } from "./RecordPanel";
import { StepGuide } from "./StepGuide";
import { useRecorder, type SaveTake } from "./useRecorder";

/** One item: where the speaker is, the words to read, and the recording card. */
export function ItemAnswer({ text, onSubmit }: { text: string; onSubmit: SaveTake }) {
  const recorder = useRecorder(onSubmit);
  return (
    <>
      <div className="mt-3 short:mt-2">
        <StepGuide step={recorder.state.name} />
      </div>
      <div className="mt-4 grid gap-4 split:grid-cols-[3fr_2fr] short:mt-2 short:grid-cols-[3fr_2fr] short:gap-3">
        <Card className="flex min-h-[140px] items-center justify-center sm:min-h-[200px] short:min-h-0 short:p-3">
          <p className="text-center text-[28px] leading-snug font-semibold tracking-tight text-balance sm:text-[34px] short:text-[24px]">
            {text}
          </p>
        </Card>
        <RecordPanel recorder={recorder} />
      </div>
    </>
  );
}
