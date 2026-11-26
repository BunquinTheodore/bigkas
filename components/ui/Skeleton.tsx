"use client";

import { useEffect, useState } from "react";
import { Container } from "./Container";

/** Fast loads show nothing at all, so the page does not flicker. */
const DELAY_MS = 150;
const BLOCK = "animate-pulse rounded-card bg-card shadow-card";

function useDelayed(): boolean {
  const [due, setDue] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDue(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return due;
}

function Blocks() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 three:grid-cols-3">
      <div className={`h-36 ${BLOCK}`} />
      <div className={`h-36 ${BLOCK}`} />
      <div className={`h-36 ${BLOCK}`} />
    </div>
  );
}

/** Grey blocks where cards are about to appear. */
export function LoadingBlocks() {
  return useDelayed() ? <Blocks /> : null;
}

/** A whole page while the sign in or an attempt is being read. */
export function PageSkeleton() {
  if (!useDelayed()) return null;
  return (
    <main>
      <Container className="pt-20 pb-12">
        <div aria-hidden className="mb-6 h-9 w-56 animate-pulse rounded-xl bg-fill" />
        <Blocks />
      </Container>
    </main>
  );
}
