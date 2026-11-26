import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusPill } from "@/components/ui/StatusPill";
import { ITEMS_PER_ATTEMPT } from "@/lib/config";
import type { AttemptStatus } from "@/lib/status";

const ACTIONS: Record<AttemptStatus, string> = {
  "not-started": "Start",
  "in-progress": "Resume",
  pending: "View status",
  processing: "View status",
  completed: "View results",
};

interface SessionCardProps {
  title: string;
  status: AttemptStatus;
  submittedCount: number;
  /** The one card whose button is filled: the next thing to do. */
  featured: boolean;
  onOpen: () => void;
}

/** Equal height cards: the button is pinned to the bottom so buttons line up. */
export function SessionCard({ title, status, submittedCount, featured, onOpen }: SessionCardProps) {
  return (
    <Card className="lift flex flex-col items-start gap-3 hover:shadow-raised">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <StatusPill status={status} submittedCount={submittedCount} />
      <ProgressBar value={submittedCount} max={ITEMS_PER_ATTEMPT} label={`Items submitted in ${title}`} />
      <Button variant={featured ? "primary" : "tinted"} className="mt-auto w-full" onClick={onOpen}>
        {ACTIONS[status]}
      </Button>
    </Card>
  );
}
