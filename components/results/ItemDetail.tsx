"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { useObjectUrl } from "@/components/useObjectUrl";
import { usePlayback } from "@/components/usePlayback";
import { ITEMS_PER_ATTEMPT } from "@/lib/config";
import { getItem } from "@/lib/items";
import type { Repository } from "@/lib/store/repository";
import type { Attempt } from "@/lib/types";
import { ResultsShell } from "./ResultsShell";
import { itemRows, itemTiles } from "./rows";
import { ScoreSection } from "./ScoreSection";
import { useCategory } from "./useCategory";
import { useResults } from "./useResults";

function StepLink({ testId, label, href }: { testId: string; label: string; href: string | null }) {
  if (!href) {
    return (
      <span data-testid={testId} aria-disabled="true" className={buttonClass("tinted", "opacity-40")}>
        {label}
      </span>
    );
  }
  return (
    <Link data-testid={testId} href={href} className={buttonClass("tinted")}>
      {label}
    </Link>
  );
}

interface ItemDetailProps {
  attempt: Attempt;
  repo: Repository;
  position: number;
}

/** One answer: what was read, how it was given, its scores and measurements. */
export function ItemDetail({ attempt, repo, position }: ItemDetailProps) {
  const [category, setCategory] = useCategory();
  const { data, failed } = useResults(repo, attempt);
  const response = data?.responses.find((r) => r.position === position);
  const result = data?.results.find((r) => r.position === position);
  const url = useObjectUrl(response?.wav ?? null);
  const play = usePlayback(url);
  const step = (n: number) => (n >= 1 && n <= ITEMS_PER_ATTEMPT ? `/attempts/${attempt.id}/items/${n}` : null);

  return (
    <Screen title={`Item ${position} of ${ITEMS_PER_ATTEMPT}`}>
      <ResultsShell attempt={attempt} current={position}>
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Pill tone="tint">Simulated</Pill>
            {response && <Pill>{response.source === "recorded" ? "Recorded" : "Uploaded"}</Pill>}
          </div>
          <p className="text-[22px] leading-snug font-semibold">{getItem(attempt.itemIds[position - 1]).text}</p>
          <Button className="self-start" disabled={!url} onClick={play}>
            Play answer
          </Button>
        </Card>
        {failed && <p role="alert" className="text-danger">The answers could not be loaded. Reload the page.</p>}
        {result && (
          <ScoreSection
            category={category}
            onCategory={setCategory}
            rows={itemRows(result, category)}
            tiles={itemTiles(result.measures)}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <StepLink testId="previous" label="Previous" href={step(position - 1)} />
          <StepLink testId="next" label="Next" href={step(position + 1)} />
        </div>
      </ResultsShell>
    </Screen>
  );
}
