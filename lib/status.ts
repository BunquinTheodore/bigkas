import { COMPLETE_MS, ITEMS_PER_ATTEMPT, PENDING_MS } from "./config";
import type { Attempt } from "./types";

export type AttemptStatus = "not-started" | "in-progress" | "pending" | "processing" | "completed";

const LABELS: Record<AttemptStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
};

/** The simulated analysis status depends only on the time since the tenth item. */
export function attemptStatus(attempt: Attempt | null, now: number): AttemptStatus {
  if (!attempt) return "not-started";
  if (attempt.submittedAt === null) return "in-progress";
  const elapsed = Math.max(0, now - attempt.submittedAt);
  if (elapsed < PENDING_MS) return "pending";
  return elapsed < COMPLETE_MS ? "processing" : "completed";
}

export function statusLabel(status: AttemptStatus, submittedCount = 0): string {
  return status === "in-progress"
    ? `${LABELS[status]} ${submittedCount} of ${ITEMS_PER_ATTEMPT}`
    : LABELS[status];
}
