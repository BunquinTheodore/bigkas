import { Explainer } from "@/components/ui/Explainer";
import { Segmented } from "@/components/ui/Segmented";
import { CATEGORIES, MODEL_LABELS } from "@/lib/config";
import { CATEGORY_LABELS } from "@/lib/format";
import { SCORE_KEYS } from "@/lib/results";
import type { Category, ScoreSet } from "@/lib/types";
import type { ScoreRow, Tile } from "./rows";
import { MeasureGrid } from "./MeasureGrid";

const COLUMNS: Record<keyof ScoreSet, string> = {
  native: "Native",
  normalized: "Normalized",
  linear: "Linear",
  ridge: "Ridge",
};

const TERMS = [
  ["Native", "The score on the model's own scale."],
  ["Normalized", "Where that score falls between the lowest and highest sample calibration scores, from 0 to 1."],
  ["Linear and Ridge", "The normalized score adjusted to the human rating scale by regression, from 0 to 1."],
  ["Speech rate", "Syllables per second."],
  ["Average pause length", "Seconds."],
  ["Average pitch", "Hertz (Hz)."],
  ["Mean intensity", "Decibels (dB)."],
] as const;

const OPTIONS = CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));

const CELL = "min-w-0 align-top tabular-nums sm:border-t sm:border-separator sm:py-3 sm:text-right";

/** A table from 640 px. On phones each row becomes its own card. */
function ScoreTable({ rows, caption }: { rows: ScoreRow[]; caption: string }) {
  return (
    <div className="sm:rounded-card sm:bg-card sm:px-5 sm:py-2 sm:shadow-card">
      <table className="block w-full sm:table sm:table-fixed">
        <caption className="sr-only">{caption}</caption>
        <thead className="hidden sm:table-header-group">
          <tr className="text-[13px] text-secondary">
            <th scope="col" className="w-[28%] py-2 text-left font-semibold">Model</th>
            {SCORE_KEYS.map((key) => (
              <th key={key} scope="col" className="w-[18%] py-2 text-right font-semibold">{COLUMNS[key]}</th>
            ))}
          </tr>
        </thead>
        <tbody className="flex flex-col gap-4 sm:table-row-group">
          {rows.map((row) => (
            <tr key={row.model} className="grid grid-cols-2 gap-3 rounded-card bg-card p-4 shadow-card sm:table-row sm:bg-transparent sm:p-0 sm:shadow-none">
              <th scope="row" className="col-span-2 text-left text-[15px] font-semibold sm:border-t sm:border-separator sm:py-3 sm:align-top">
                {MODEL_LABELS[row.model]}
              </th>
              {SCORE_KEYS.map((key) => (
                <td key={key} className={CELL}>
                  <span className="block text-xs text-secondary sm:hidden">{COLUMNS[key]}</span>
                  <span className="block font-semibold">{row.cells[key].value}</span>
                  {row.cells[key].notes.map((note) => (
                    <span key={note} className="block text-xs text-secondary">{note}</span>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ScoreSectionProps {
  category: Category;
  onCategory: (category: Category) => void;
  rows: ScoreRow[];
  tiles: Tile[];
}

export function ScoreSection({ category, onCategory, rows, tiles }: ScoreSectionProps) {
  return (
    <>
      <Segmented label="Category" value={category} options={OPTIONS} onChange={onCategory} />
      <Explainer terms={TERMS} note="All values here are simulated." />
      <ScoreTable rows={rows} caption={`${CATEGORY_LABELS[category]} scores`} />
      <MeasureGrid tiles={tiles} />
    </>
  );
}
