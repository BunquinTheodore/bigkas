import { ChevronDown } from "lucide-react";

interface ExplainerProps {
  terms: readonly (readonly [string, string])[];
  note: string;
}

/** A closed row of plain definitions, so the numbers can be understood without crowding the page. */
export function Explainer({ terms, note }: ExplainerProps) {
  return (
    <details className="group rounded-card bg-card px-4 shadow-card sm:px-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-[15px] font-semibold text-tint-text [&::-webkit-details-marker]:hidden">
        What do these numbers mean?
        <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <dl className="flex flex-col gap-3 pt-1 pb-3">
        {terms.map(([term, meaning]) => (
          <div key={term}>
            <dt className="text-[15px] font-semibold">{term}</dt>
            <dd className="text-[15px] text-secondary">{meaning}</dd>
          </div>
        ))}
      </dl>
      <p className="pb-4 text-[13px] text-secondary">{note}</p>
    </details>
  );
}
