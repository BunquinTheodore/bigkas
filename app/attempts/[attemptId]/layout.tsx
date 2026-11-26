import type { Metadata } from "next";
import type { ReactNode } from "react";

// A template of its own, or the pages below would lose the app name from their titles.
export const metadata: Metadata = { title: { default: "Session", template: "%s, bigkas" } };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
