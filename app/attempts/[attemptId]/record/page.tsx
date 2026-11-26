"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AttemptGate } from "@/components/AttemptGate";
import { Guard } from "@/components/Guard";
import { ItemAnswer } from "@/components/recorder/ItemAnswer";
import { Container } from "@/components/ui/Container";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TopBar } from "@/components/ui/TopBar";
import { useSignOut } from "@/components/useSignOut";
import { ITEMS_PER_ATTEMPT, SESSIONS } from "@/lib/config";
import { getItem } from "@/lib/items";
import { StoreError, type Repository } from "@/lib/store/repository";
import type { Attempt, Source } from "@/lib/types";

interface RecordingProps {
  attempt: Attempt;
  repo: Repository;
  reload: () => Promise<void>;
}

/** The other tab saved this item, or the demo data was erased: either way the screen is out of date. */
const isStale = (error: unknown) =>
  error instanceof StoreError && (error.code === "already-submitted" || error.code === "not-found");

/** Moves focus to the heading when the next item appears, so keyboard users are not dropped. */
function useNewItemFocus(position: number) {
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef(position);

  useEffect(() => {
    if (shown.current === position) return;
    shown.current = position;
    heading.current?.focus();
  }, [position]);

  return heading;
}

function Recording({ attempt, repo, reload }: RecordingProps) {
  const router = useRouter();
  const signOut = useSignOut();
  const submitted = attempt.submittedAt !== null;
  const position = attempt.submittedCount + 1;
  const heading = useNewItemFocus(position);

  useEffect(() => {
    if (submitted) router.replace(`/attempts/${attempt.id}`);
  }, [submitted, attempt.id, router]);

  if (submitted) return null;
  const item = getItem(attempt.itemIds[position - 1]);
  const session = SESSIONS.find((s) => s.id === attempt.sessionId);

  async function save(wav: ArrayBuffer, durationMs: number, source: Source) {
    try {
      await repo.submitResponse({ attemptId: attempt.id, position, source, wav, durationMs }, Date.now());
    } catch (error) {
      if (!isStale(error)) throw error;
    }
    await reload();
  }

  return (
    <>
      <TopBar title={session?.title ?? "bigkas"} back={{ label: "Sessions", href: "/sessions" }} onSignOut={signOut} />
      <main>
        <Container className="rise pt-6 pb-12 short:pt-2 short:pb-4">
          <div className="flex items-center justify-between gap-3">
            <h1 ref={heading} tabIndex={-1} className="text-[22px] font-bold tracking-tight">
              Item {position} of {ITEMS_PER_ATTEMPT}
            </h1>
            <Pill>{item.type === "sentence" ? "Sentence" : "Phrase fragment"}</Pill>
          </div>
          <ProgressBar value={attempt.submittedCount} max={ITEMS_PER_ATTEMPT} label="Items submitted" className="mt-3 short:mt-2" />
          {/* Not keyed by item, so the orb keeps drawing. The recorder returns to ready once saved. */}
          <ItemAnswer text={item.text} onSubmit={save} />
        </Container>
      </main>
    </>
  );
}

export default function RecordPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  return (
    <Guard role="participant">
      {({ profile, repo }) => (
        <AttemptGate attemptId={attemptId} repo={repo} email={profile.email}>
          {(attempt, reload) => <Recording attempt={attempt} repo={repo} reload={reload} />}
        </AttemptGate>
      )}
    </Guard>
  );
}
