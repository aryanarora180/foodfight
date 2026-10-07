import type { Phase } from "@/lib/types";

const STEPS: { phase: Phase; label: string }[] = [
  { phase: "submission", label: "Nominate" },
  { phase: "voting", label: "Vote" },
  { phase: "results", label: "Results" },
];

// Where the round is, at a glance: done steps get a check, the current one
// is lit, the rest are dim.
export function PhaseSteps({ phase }: { phase: Phase }) {
  const current = STEPS.findIndex((s) => s.phase === phase);
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs font-semibold" aria-label="round progress">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.phase} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                active
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : done
                    ? "border-win/30 text-win/80"
                    : "border-white/10 text-white/30"
              }`}
            >
              {done && "✓"}
              {step.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-white/15 sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}
