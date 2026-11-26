"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Guard, type GuardContext } from "@/components/Guard";
import { SessionCard } from "@/components/sessions/SessionCard";
import { Screen } from "@/components/ui/Screen";
import { TopBar } from "@/components/ui/TopBar";
import { useNow } from "@/components/useNow";
import { useSignOut } from "@/components/useSignOut";
import { ITEMS_PER_ATTEMPT, SESSIONS } from "@/lib/config";
import { attemptStatus } from "@/lib/status";
import type { Attempt, SessionId } from "@/lib/types";

function Sessions({ profile, repo }: GuardContext) {
  const router = useRouter();
  const signOut = useSignOut();
  const now = useNow();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repo
      .listAttempts(profile.email)
      .then(setAttempts)
      .catch((failure: unknown) => {
        console.error("Could not load sessions", failure);
        setError("The sessions could not be loaded. Reload the page.");
      });
  }, [repo, profile.email]);

  async function open(sessionId: SessionId, existing: Attempt | undefined) {
    try {
      const attempt = existing ?? (await repo.startAttempt(profile.email, sessionId, Math.random, Date.now()));
      const recording = attempt.submittedAt === null;
      router.push(recording ? `/attempts/${attempt.id}/record` : `/attempts/${attempt.id}`);
    } catch (failure) {
      console.error("Could not start the session", failure);
      setError("The session could not be started. Try again.");
    }
  }

  return (
    <>
      <TopBar title="bigkas" onSignOut={signOut} />
      <Screen title="Reading sessions" subtitle={`Participant ${profile.participantCode}`}>
        {attempts && (
          <div className="grid gap-4 three:grid-cols-3">
            {SESSIONS.map((session) => {
              const attempt = attempts.find((a) => a.sessionId === session.id);
              return (
                <SessionCard
                  key={session.id}
                  title={session.title}
                  status={attemptStatus(attempt ?? null, now)}
                  submittedCount={attempt?.submittedCount ?? 0}
                  onOpen={() => open(session.id, attempt)}
                />
              );
            })}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-[15px] text-record">
            {error}
          </p>
        )}
        <p className="mt-4 text-[13px] text-secondary">
          Each session has {ITEMS_PER_ATTEMPT} items. One attempt per session.
        </p>
      </Screen>
    </>
  );
}

export default function SessionsPage() {
  return <Guard role="participant">{(context) => <Sessions {...context} />}</Guard>;
}
