"use client";

import { useState } from "react";
import { Guard } from "@/components/Guard";
import { ReportTable } from "@/components/research/ReportTable";
import { Explainer } from "@/components/ui/Explainer";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { Segmented } from "@/components/ui/Segmented";
import { TopBar } from "@/components/ui/TopBar";
import { useSignOut } from "@/components/useSignOut";
import { buildReport } from "@/lib/agreement";
import { CATEGORIES } from "@/lib/config";
import { FITS, SAMPLE_ROWS } from "@/lib/fits";
import { CATEGORY_LABELS } from "@/lib/format";
import type { Category } from "@/lib/types";

/** Computed once from the fixed sample data. Participant attempts have no ratings. */
const REPORT = buildReport(SAMPLE_ROWS, FITS);
const OPTIONS = CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));

const TERMS = [
  ["Baseline", "The normalized score before calibration."],
  ["MAE", "The average gap between score and human rating. Lower is closer."],
  ["RMSE", "Like MAE, but larger gaps count for more."],
  ["Spearman", "How well the scores keep the order of the ratings, from minus 1 to 1."],
  ["Coverage", "The share of held out items that have a score."],
] as const;

function AgreementReport() {
  const signOut = useSignOut();
  const [category, setCategory] = useState<Category>("pronunciation");
  const report = REPORT[category];

  return (
    <>
      <TopBar title="bigkas" onSignOut={signOut} />
      <Screen title="Agreement with human ratings">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <Pill tone="tint">Sample data</Pill>
            </span>
            <div className="w-full sm:w-[420px]">
              <Segmented label="Category" value={category} options={OPTIONS} onChange={setCategory} />
            </div>
          </div>
          <Explainer terms={TERMS} note="Sample data only." />
          <ReportTable report={report} caption={`Agreement for ${CATEGORY_LABELS[category]}`} />
          <p className="text-[13px] text-secondary">
            These numbers tell nothing about the real models. Baseline is not fitted to the rating scale, so lower
            error after calibration is expected here.
          </p>
          <p className="text-[13px] text-secondary">
            Held out speakers: {report.speakers}. Items compared: {report.items}.
          </p>
        </div>
      </Screen>
    </>
  );
}

export default function ResearchPage() {
  return <Guard role="researcher">{() => <AgreementReport />}</Guard>;
}
