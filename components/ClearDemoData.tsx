"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getRepository } from "@/lib/store/client";
import { clearCurrent } from "@/lib/store/current";

type Step = "idle" | "confirm" | "done" | "failed";

/** Erases everything after an in page confirmation (no browser dialogs). */
export function ClearDemoData() {
  const [step, setStep] = useState<Step>("idle");

  async function erase() {
    try {
      const repo = await getRepository();
      await repo.clearAll();
      clearCurrent();
      setStep("done");
    } catch (error) {
      console.error("Could not erase demo data", error);
      setStep("failed");
    }
  }

  if (step === "confirm") {
    return (
      <div className="mt-4 rounded-xl bg-fill p-4 text-center">
        <p className="text-[15px]">Erase everything, including unfinished sessions?</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button onClick={() => setStep("idle")}>Cancel</Button>
          <Button variant="primary" onClick={erase}>
            Erase
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <Button variant="plain" onClick={() => setStep("confirm")}>
        Clear demo data
      </Button>
      <p role="status" className="text-[13px] text-secondary">
        {step === "done" && "Demo data erased."}
        {step === "failed" && "The demo data could not be erased."}
      </p>
    </div>
  );
}
