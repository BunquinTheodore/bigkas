import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
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
  onOpen: () => void;
}

/** Equal height cards: the button is pinned to the bottom so buttons line up. */
export function SessionCard({ title, status, submittedCount, onOpen }: SessionCardProps) {
  return (
    <Card className="flex flex-col items-start gap-3">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <StatusPill status={status} submittedCount={submittedCount} />
      <Button variant={status === "in-progress" ? "primary" : "tinted"} className="mt-auto w-full" onClick={onOpen}>
        {ACTIONS[status]}
      </Button>
    </Card>
  );
}
