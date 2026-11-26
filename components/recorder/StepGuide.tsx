import type { PanelState } from "@/lib/recorder-state";

const STEPS = ["Read", "Record", "Submit"] as const;
type Step = (typeof STEPS)[number];

const CURRENT: Record<PanelState["name"], readonly Step[]> = {
  ready: ["Read", "Record"],
  recording: ["Record"],
  processing: ["Record"],
  review: ["Submit"],
  saving: ["Submit"],
};

/** Where the speaker is. The current step is marked by a filled number, weight and aria-current. */
export function StepGuide({ step }: { step: PanelState["name"] }) {
  return (
    <ol aria-label="Steps" className="grid grid-cols-3 gap-2 sm:gap-4">
      {STEPS.map((name, index) => {
        const current = CURRENT[step].includes(name);
        return (
          <li
            key={name}
            aria-current={current ? "step" : undefined}
            className="group flex min-h-9 items-center justify-center gap-2 rounded-full text-[13px] aria-[current=step]:bg-card aria-[current=step]:font-semibold aria-[current=step]:shadow-card sm:text-[15px] short:min-h-7"
          >
            <span className="grid size-6 place-items-center rounded-full bg-fill text-[13px] font-semibold group-aria-[current=step]:bg-tint group-aria-[current=step]:text-white short:size-5">
              {index + 1}
            </span>{" "}
            <span>{name}</span>
          </li>
        );
      })}
    </ol>
  );
}
