import Link from "next/link";
import type { ReactNode } from "react";
import { getItem } from "@/lib/items";
import type { Attempt } from "@/lib/types";

interface ListLinkProps {
  href: string;
  current: boolean;
  title: string;
  text?: string;
}

function ListLink({ href, current, title, text }: ListLinkProps) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="flex min-h-11 flex-col justify-center rounded-xl px-3 py-2 aria-[current=page]:bg-fill"
    >
      <span className="text-[15px] font-semibold">{title}</span>
      {text && <span className="text-[13px] text-secondary">{text}</span>}
    </Link>
  );
}

interface ResultsShellProps {
  attempt: Attempt;
  current: number | "summary";
  children: ReactNode;
}

/** From 900 px the item list sits beside the scores. Below that, the scores come first. */
export function ResultsShell({ attempt, current, children }: ResultsShellProps) {
  const base = `/attempts/${attempt.id}`;
  return (
    <div className="grid gap-4 split:grid-cols-[240px_minmax(0,1fr)] split:items-start">
      <div data-testid="score-region" className="flex min-w-0 flex-col gap-4 split:order-2">
        {children}
      </div>
      <nav aria-label="Items" className="min-w-0 split:order-1">
        <div data-testid="item-list" className="flex flex-col gap-1 rounded-card bg-card p-2">
          <ListLink href={base} current={current === "summary"} title="Summary" />
          {attempt.itemIds.map((itemId, index) => (
            <ListLink
              key={itemId}
              href={`${base}/items/${index + 1}`}
              current={current === index + 1}
              title={`Item ${index + 1}`}
              text={getItem(itemId).text}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
