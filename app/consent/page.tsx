"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Guard, type GuardContext } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TopBar } from "@/components/ui/TopBar";
import { useSignOut } from "@/components/useSignOut";
import { StoreError } from "@/lib/store/repository";

const POINTS = [
  "This is a demo. Your answers stay in this browser and are not sent anywhere.",
  "You will read short sentences aloud and record them, or upload audio files.",
  "Scores and measurements shown later are simulated.",
  "You can erase everything with Clear demo data on the sign in screen.",
];

function ConsentForm({ profile, repo }: GuardContext) {
  const router = useRouter();
  const signOut = useSignOut();
  const [adult, setAdult] = useState(false);
  const [failed, setFailed] = useState(false);

  async function agree() {
    setFailed(false);
    try {
      await repo.giveConsent(profile.email, Date.now());
      router.replace("/sessions");
    } catch (error) {
      console.error("Consent was not saved", error);
      // The profile is gone, for example erased in another tab, so trying again cannot work.
      if (error instanceof StoreError && error.code === "not-found") return signOut();
      setFailed(true);
    }
  }

  return (
    <>
      <TopBar title="bigkas" onSignOut={signOut} />
      <Screen title="Before you start" width="narrow">
        <div className="flex flex-col gap-3">
          {POINTS.map((point) => (
            <p key={point}>{point}</p>
          ))}
        </div>
        <label className="mt-6 flex min-h-11 items-center gap-3 rounded-xl bg-fill px-4 py-2 font-semibold">
          <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} className="size-5 accent-tint" />
          I am 18 or older
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button onClick={signOut}>Decline</Button>
          <Button variant="primary" disabled={!adult} onClick={agree}>
            Agree
          </Button>
        </div>
        {failed && (
          <p role="alert" className="mt-4 text-center text-[15px] text-danger">
            Your consent was not saved. Try Agree again.
          </p>
        )}
      </Screen>
    </>
  );
}

export default function ConsentPage() {
  return (
    <Guard role="participant" requireConsent={false}>
      {(context) => <ConsentForm {...context} />}
    </Guard>
  );
}
