import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-testid="card" className={`rounded-card bg-card p-4 shadow-card sm:p-5 ${className}`} {...props} />;
}
