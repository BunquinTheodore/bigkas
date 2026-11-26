"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AttemptGate } from "@/components/AttemptGate";
import { Guard } from "@/components/Guard";
import { RecordPanel } from "@/components/recorder/RecordPanel";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Pill } from "@/components/ui/Pill";
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

function Progress({ done }: { done: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Items submitted"
      aria-valuemin={0}
      aria-valuemax={ITEMS_PER_ATTEMPT}
      aria-valuenow={done}
      className="mt-3 h-1.5 overflow-hidden rounded-full bg-fill"
    >
      <div className="h-full bg-tint transition-[width]" style={{ width: `${(done / ITEMS_PER_ATTEMPT) * 100}%` }} />
    </div>
  );
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
        <Container className="pt-6 pb-12">
          <div className="flex items-center justify-between gap-3">
            <h1 ref={heading} tabIndex={-1} className="text-[22px] font-bold tracking-tight">
              Item {position} of {ITEMS_PER_ATTEMPT}
            </h1>
            <Pill>{item.type === "sentence" ? "Sentence" : "Phrase fragment"}</Pill>
          </div>
          <Progress done={attempt.submittedCount} />
          <div className="mt-6 grid gap-4 split:grid-cols-[3fr_2fr]">
            <Card className="flex min-h-[200px] items-center justify-center">
              <p className="text-center text-[28px] leading-snug font-semibold tracking-tight text-balance sm:text-[34px]">
                {item.text}
              </p>
            </Card>
            <RecordPanel key={position} onSubmit={save} />
          </div>
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
