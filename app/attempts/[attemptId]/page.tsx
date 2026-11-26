"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AttemptGate } from "@/components/AttemptGate";
import { Guard } from "@/components/Guard";
import { SessionSummary } from "@/components/results/SessionSummary";
import { buttonClass } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { TopBar } from "@/components/ui/TopBar";
import { useNow } from "@/components/useNow";
import { useSignOut } from "@/components/useSignOut";
import { SESSIONS } from "@/lib/config";
import { attemptStatus, type AttemptStatus } from "@/lib/status";
import type { Repository } from "@/lib/store/repository";
import type { Attempt } from "@/lib/types";

const MESSAGES: Partial<Record<AttemptStatus, string>> = {
  "in-progress": "This session is not finished yet.",
  pending: "Your answers are waiting to be analyzed.",
  processing: "Analyzing your answers.",
};

function Waiting({ attempt, status }: { attempt: Attempt; status: AttemptStatus }) {
  const unfinished = status === "in-progress";
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <StatusPill status={status} submittedCount={attempt.submittedCount} />
      <p role="status">{MESSAGES[status]}</p>
      <Link
        href={unfinished ? `/attempts/${attempt.id}/record` : "/sessions"}
        className={buttonClass(unfinished ? "primary" : "tinted", "w-full")}
      >
        {unfinished ? "Continue recording" : "Back to reading sessions"}
      </Link>
    </div>
  );
}

function AttemptView({ attempt, repo }: { attempt: Attempt; repo: Repository }) {
  const signOut = useSignOut();
  const status = attemptStatus(attempt, useNow());
  const title = SESSIONS.find((s) => s.id === attempt.sessionId)?.title ?? "Session";

  return (
    <>
      <TopBar title="bigkas" back={{ label: "Sessions", href: "/sessions" }} onSignOut={signOut} />
      {status === "completed" ? (
        <SessionSummary attempt={attempt} repo={repo} title={title} />
      ) : (
        <Screen title={title} width="narrow">
          <Waiting attempt={attempt} status={status} />
        </Screen>
      )}
    </>
  );
}

export default function AttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  return (
    <Guard role="participant">
      {({ profile, repo }) => (
        <AttemptGate attemptId={attemptId} repo={repo} email={profile.email}>
          {(attempt) => <AttemptView attempt={attempt} repo={repo} />}
        </AttemptGate>
      )}
    </Guard>
  );
}
