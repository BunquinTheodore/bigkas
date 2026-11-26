import type { ReactNode } from "react";

interface PillProps {
  tone?: "neutral" | "tint";
  className?: string;
  children: ReactNode;
}

export function Pill({ tone = "neutral", className = "", children }: PillProps) {
  const color = tone === "tint" ? "text-tint-text" : "";
  return (
    <span className={`pill inline-block rounded-full bg-fill px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${color} ${className}`}>
      {children}
    </span>
  );
}
