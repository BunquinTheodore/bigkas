import { statusLabel, type AttemptStatus } from "@/lib/status";
import { Pill } from "./Pill";

const TONES: Record<AttemptStatus, string> = {
  "not-started": "text-label",
  "in-progress": "text-orange",
  pending: "text-secondary",
  processing: "text-tint-text",
  completed: "text-green",
};

/** The status always shows a word, never colour alone. */
export function StatusPill({ status, submittedCount }: { status: AttemptStatus; submittedCount?: number }) {
  return <Pill className={TONES[status]}>{statusLabel(status, submittedCount)}</Pill>;
}
