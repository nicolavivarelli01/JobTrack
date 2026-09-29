import { AlertTriangle } from "lucide-react";

import { columnName } from "@/components/import/column-mapping";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { outcomes, stages, type Outcome, type Stage } from "@/lib/applications";
import { guessOutcome, guessStage } from "@/lib/import/status";
import type { ValueMap } from "@/lib/import/types";

const visibleValueLimit = 50;

/**
 * Every distinct value in a status column, with the stage and/or result it
 * will import as. Values the guesser didn't recognize are highlighted until
 * the user picks something.
 */
export function StatusValuesSection({
  headers,
  column,
  values,
  showsStage,
  showsOutcome,
  stageValues,
  outcomeValues,
  stageOverrides,
  outcomeOverrides,
  onStageChange,
  onOutcomeChange,
}: {
  headers: string[];
  column: number;
  values: { key: string; raw: string }[];
  showsStage: boolean;
  showsOutcome: boolean;
  stageValues: ValueMap<Stage>;
  outcomeValues: ValueMap<Outcome>;
  stageOverrides: ValueMap<Stage>;
  outcomeOverrides: ValueMap<Outcome>;
  onStageChange: (key: string, stage: Stage) => void;
  onOutcomeChange: (key: string, outcome: Outcome) => void;
}) {
  if (values.length === 0) return null;

  return (
    <section>
      <h3 className="text-sm font-medium text-foreground">
        Values in &ldquo;{columnName(headers, column)}&rdquo;
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Tell JobTrack what each value means. Values we couldn&apos;t recognize
        are highlighted.
      </p>
      <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.07]">
        <div className="hidden grid-cols-[1fr_auto_auto] gap-2 border-b border-white/[0.07] bg-white/[0.025] px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground sm:grid">
          <span>Value in file</span>
          {showsStage && <span className="w-44">Stage reached</span>}
          {showsOutcome && <span className="w-44">Current result</span>}
        </div>
        {values.slice(0, visibleValueLimit).map(({ key, raw }) => {
          const needsReview =
            (showsStage &&
              !guessStage(raw).recognized &&
              !stageOverrides[key]) ||
            (showsOutcome &&
              !guessOutcome(raw).recognized &&
              !outcomeOverrides[key]);

          return (
            <div
              key={key}
              className={`grid items-center gap-2 border-b border-white/[0.06] px-3.5 py-2.5 last:border-b-0 sm:grid-cols-[1fr_auto_auto] ${
                needsReview ? "bg-[#ffb562]/[0.06]" : ""
              }`}
            >
              <span className="flex min-w-0 items-center gap-2 text-sm">
                {needsReview && (
                  <AlertTriangle
                    className="size-3.5 shrink-0 text-[#ffb562]"
                    aria-label="Not recognized"
                  />
                )}
                <span className="truncate">{raw}</span>
              </span>
              {showsStage && (
                <NativeSelect
                  size="sm"
                  className="w-full sm:w-44"
                  aria-label={`Stage for ${raw}`}
                  value={stageValues[key]}
                  onChange={(event) =>
                    onStageChange(key, event.target.value as Stage)
                  }
                >
                  {stages.map((stage) => (
                    <NativeSelectOption key={stage} value={stage}>
                      {stage}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
              {showsOutcome && (
                <NativeSelect
                  size="sm"
                  className="w-full sm:w-44"
                  aria-label={`Result for ${raw}`}
                  value={outcomeValues[key]}
                  onChange={(event) =>
                    onOutcomeChange(key, event.target.value as Outcome)
                  }
                >
                  {outcomes.map((outcome) => (
                    <NativeSelectOption key={outcome} value={outcome}>
                      {outcome}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </div>
          );
        })}
      </div>
      {values.length > visibleValueLimit && (
        <p className="mt-2 text-xs text-[#ffd09a]">
          This column has {values.length} different values. It may not be a
          status column; only the first {visibleValueLimit} are shown.
        </p>
      )}
    </section>
  );
}
