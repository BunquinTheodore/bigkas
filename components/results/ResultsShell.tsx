"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMediaQuery } from "@/components/useMediaQuery";
import { getItem } from "@/lib/items";
import type { Attempt } from "@/lib/types";

/** The same width as the `split` breakpoint in globals.css. */
const SIDE_BY_SIDE = "(min-width: 56.25rem)";

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

function ItemList({ attempt, current }: Omit<ResultsShellProps, "children">) {
  const base = `/attempts/${attempt.id}`;
  return (
    <nav aria-label="Items" className="min-w-0">
      <div data-testid="item-list" className="flex flex-col gap-1 rounded-card bg-card p-2 shadow-card">
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
  );
}

/**
 * From 900 px the item list sits beside the scores. Below that, the scores come first. The page
 * order changes with the layout, so keyboard and screen reader users meet things as they appear.
 */
export function ResultsShell({ attempt, current, children }: ResultsShellProps) {
  const sideBySide = useMediaQuery(SIDE_BY_SIDE);
  const scores = (
    <div key="scores" data-testid="score-region" className="flex min-w-0 flex-col gap-4">
      {children}
    </div>
  );
  const list = <ItemList key="list" attempt={attempt} current={current} />;
  return (
    <div className="grid gap-4 split:grid-cols-[240px_minmax(0,1fr)] split:items-start">
      {sideBySide ? [list, scores] : [scores, list]}
    </div>
  );
}
