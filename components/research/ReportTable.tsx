import { METHODS, type CategoryReport } from "@/lib/agreement";
import { MODEL_LABELS, MODELS } from "@/lib/config";
import type { Method, ModelId } from "@/lib/types";

const METHOD_LABELS: Record<Method, string> = { normalized: "Baseline", linear: "Linear", ridge: "Ridge" };
const STATS = ["mae", "rmse", "spearman"] as const;
const STAT_LABELS = { mae: "MAE", rmse: "RMSE", spearman: "Spearman" };

const stat = (value: number | null) => (value === null ? "Undefined" : value.toFixed(3));
const percent = (share: number) => `${Math.round(share * 100)}%`;

const HEAD = "py-2 font-semibold";
const CELL = "border-t border-separator py-3";

function ModelRows({ report, model }: { report: CategoryReport; model: ModelId }) {
  const { methods, coverage } = report.models[model];
  return (
    <tbody>
      {METHODS.map((method, index) => (
        <tr key={method}>
          {index === 0 && (
            <th scope="rowgroup" rowSpan={METHODS.length} className={`${CELL} text-left align-top font-semibold`}>
              {MODEL_LABELS[model]}
            </th>
          )}
          <th scope="row" className={`${CELL} text-left font-normal`}>{METHOD_LABELS[method]}</th>
          {STATS.map((key) => (
            <td key={key} className={`${CELL} text-right`}>{stat(methods[method][key])}</td>
          ))}
          {index === 0 && (
            <td rowSpan={METHODS.length} className={`${CELL} text-right align-top font-semibold`}>
              {percent(coverage)}
            </td>
          )}
        </tr>
      ))}
    </tbody>
  );
}

function ModelCard({ report, model }: { report: CategoryReport; model: ModelId }) {
  const { methods, coverage } = report.models[model];
  return (
    <div className="rounded-card bg-card p-4">
      <h2 className="text-[15px] font-semibold">{MODEL_LABELS[model]}</h2>
      <p className="text-[13px] text-secondary">Coverage {percent(coverage)}</p>
      <div className="mt-3 grid grid-cols-[1.3fr_1fr_1fr_1.3fr] gap-x-2 gap-y-2 text-sm tabular-nums">
        <span className="text-xs text-secondary">Method</span>
        {STATS.map((key) => (
          <span key={key} className="text-right text-xs text-secondary">{STAT_LABELS[key]}</span>
        ))}
        {METHODS.map((method) => (
          <div key={method} className="contents">
            <span>{METHOD_LABELS[method]}</span>
            {STATS.map((key) => (
              <span key={key} className="text-right">{stat(methods[method][key])}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A table from 640 px, one card per model on phones. */
export function ReportTable({ report, caption }: { report: CategoryReport; caption: string }) {
  return (
    <div data-testid="report">
      <div className="hidden rounded-card bg-card px-5 py-2 sm:block">
        <table className="w-full table-fixed text-[15px] tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-[13px] text-secondary">
              <th scope="col" className={`${HEAD} w-[24%] text-left`}>Model</th>
              <th scope="col" className={`${HEAD} w-[16%] text-left`}>Method</th>
              {STATS.map((key) => (
                <th key={key} scope="col" className={`${HEAD} w-[15%] text-right`}>{STAT_LABELS[key]}</th>
              ))}
              <th scope="col" className={`${HEAD} w-[15%] text-right`}>Coverage</th>
            </tr>
          </thead>
          {MODELS.map((model) => (
            <ModelRows key={model} report={report} model={model} />
          ))}
        </table>
      </div>
      <div className="flex flex-col gap-4 sm:hidden">
        {MODELS.map((model) => (
          <ModelCard key={model} report={report} model={model} />
        ))}
      </div>
    </div>
  );
}
