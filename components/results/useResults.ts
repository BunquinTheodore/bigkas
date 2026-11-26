"use client";

import { useEffect, useState } from "react";
import { FITS } from "@/lib/fits";
import { itemResult } from "@/lib/results";
import type { Repository } from "@/lib/store/repository";
import type { Attempt, ItemResult, StoredResponse } from "@/lib/types";

export interface LoadedResults {
  results: ItemResult[];
  responses: StoredResponse[];
}

/** Loads the saved answers and computes their simulated results. Null while loading. */
export function useResults(repo: Repository, attempt: Attempt) {
  const [data, setData] = useState<LoadedResults | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    repo
      .listResponses(attempt.id)
      .then((responses) => {
        const results = responses.map((r) => itemResult(attempt, r.position, r.source, FITS));
        if (active) setData({ results, responses });
      })
      .catch((error: unknown) => {
        console.error("Could not load the answers", error);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [repo, attempt]);

  return { data, failed };
}
