"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AttemptGate } from "@/components/AttemptGate";
import { Guard } from "@/components/Guard";
import { ItemDetail } from "@/components/results/ItemDetail";
import { TopBar } from "@/components/ui/TopBar";
import { useNow } from "@/components/useNow";
import { useSignOut } from "@/components/useSignOut";
import { ITEMS_PER_ATTEMPT } from "@/lib/config";
import { attemptStatus } from "@/lib/status";
import type { Repository } from "@/lib/store/repository";
import type { Attempt } from "@/lib/types";

interface ItemViewProps {
  attempt: Attempt;
  repo: Repository;
  position: number;
}

/** Results only open once the analysis is complete, and only for items 1 to 10. */
function ItemView({ attempt, repo, position }: ItemViewProps) {
  const router = useRouter();
  const signOut = useSignOut();
  const completed = attemptStatus(attempt, useNow()) === "completed";
  const exists = Number.isInteger(position) && position >= 1 && position <= ITEMS_PER_ATTEMPT;
  const allowed = completed && exists;

  useEffect(() => {
    if (!allowed) router.replace(`/attempts/${attempt.id}`);
  }, [allowed, attempt.id, router]);

  if (!allowed) return null;
  return (
    <>
      <TopBar title="bigkas" back={{ label: "Summary", href: `/attempts/${attempt.id}` }} onSignOut={signOut} />
      <ItemDetail key={position} attempt={attempt} repo={repo} position={position} />
    </>
  );
}

export default function ItemPage() {
  const { attemptId, n } = useParams<{ attemptId: string; n: string }>();
  return (
    <Guard role="participant">
      {({ profile, repo }) => (
        <AttemptGate attemptId={attemptId} repo={repo} email={profile.email}>
          {(attempt) => <ItemView attempt={attempt} repo={repo} position={Number(n)} />}
        </AttemptGate>
      )}
    </Guard>
  );
}
