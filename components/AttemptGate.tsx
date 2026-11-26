"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { PageSkeleton } from "@/components/ui/Skeleton";
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

function Unreadable() {
  const signOut = useSignOut();
  return (
    <>
      <TopBar title="bigkas" onSignOut={signOut} />
      <Screen title="This session could not load" width="narrow">
        <p className="text-center">The saved demo data could not be read. Reload the page to try again.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/sessions" className={buttonClass("tinted")}>
            Sessions
          </Link>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </Screen>
    </>
  );
}

/** "missing" also covers an attempt that belongs to someone else. "failed" is a read error. */
type Loaded = Attempt | "loading" | "missing" | "failed";

/** Loads an attempt and only shows it to the profile that owns it. */
export function AttemptGate({ attemptId, repo, email, children }: AttemptGateProps) {
  const [attempt, setAttempt] = useState<Loaded>("loading");

  const load = useCallback(async () => {
    try {
      const found = await repo.getAttempt(attemptId);
      setAttempt(found && found.email === email ? found : "missing");
    } catch (error) {
      console.error("Could not load the session", error);
      setAttempt("failed");
    }
  }, [repo, attemptId, email]);

  useEffect(() => {
    void load();
  }, [load]);

  if (attempt === "loading") return <PageSkeleton />;
  if (attempt === "missing") return <Missing />;
  if (attempt === "failed") return <Unreadable />;
  return <>{children(attempt, load)}</>;
}
