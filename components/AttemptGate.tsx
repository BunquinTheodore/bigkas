"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TopBar } from "@/components/ui/TopBar";
import { useSignOut } from "@/components/useSignOut";
import type { Repository } from "@/lib/store/repository";
import type { Attempt } from "@/lib/types";

interface AttemptGateProps {
  attemptId: string;
  repo: Repository;
  email: string;
  children: (attempt: Attempt, reload: () => Promise<void>) => ReactNode;
}

function Missing() {
  const signOut = useSignOut();
  return (
    <>
      <TopBar title="bigkas" onSignOut={signOut} />
      <Screen title="Session not found" width="narrow">
        <p className="text-center">This session is not in this profile&apos;s demo data.</p>
        <Link href="/sessions" className={buttonClass("primary", "mt-4 w-full")}>
          Go to reading sessions
        </Link>
      </Screen>
    </>
  );
}

/** Loads an attempt and only shows it to the profile that owns it. */
export function AttemptGate({ attemptId, repo, email, children }: AttemptGateProps) {
  // undefined while loading, null when it is missing or belongs to someone else.
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const found = await repo.getAttempt(attemptId);
      setAttempt(found && found.email === email ? found : null);
    } catch (error) {
      console.error("Could not load the session", error);
      setAttempt(null);
    }
  }, [repo, attemptId, email]);

  useEffect(() => {
    void load();
  }, [load]);

  if (attempt === undefined) return null;
  return attempt ? <>{children(attempt, load)}</> : <Missing />;
}
