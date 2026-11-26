"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { summarize } from "@/lib/results";
import type { Repository } from "@/lib/store/repository";
import type { Attempt, Category } from "@/lib/types";
import { ResultsShell } from "./ResultsShell";
import { summaryRows, summaryTiles } from "./rows";
import { ScoreSection } from "./ScoreSection";
import { useResults } from "./useResults";

interface SessionSummaryProps {
  attempt: Attempt;
  repo: Repository;
  title: string;
}

/** Means over the ten items, each with how many items contributed. */
export function SessionSummary({ attempt, repo, title }: SessionSummaryProps) {
  const [category, setCategory] = useState<Category>("pronunciation");
  const { data, failed } = useResults(repo, attempt);
  const summary = data && summarize(data.results);

  return (
    <Screen title={`${title} results`}>
      <ResultsShell attempt={attempt} current="summary">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Pill tone="tint">Simulated</Pill>
          <span className="text-[13px] text-secondary">Means over the answered items</span>
        </div>
        {failed && <p role="alert" className="text-danger">The answers could not be loaded. Reload the page.</p>}
        {summary && (
          <ScoreSection
            category={category}
            onCategory={setCategory}
            rows={summaryRows(summary, category)}
            tiles={summaryTiles(summary)}
          />
        )}
      </ResultsShell>
    </Screen>
  );
}
