import { stageRank, stages, type Stage } from "@/lib/applications";
import { guessStage } from "@/lib/import/status";
import type { ColumnMapping, ProgressColumn } from "@/lib/import/types";

// "No" or "-" in a progress column means the round did not happen.
const negativeCellPattern = /^(no|n|false|0|-|–|—|n\/a|na|none|not yet)$/i;

export function isProgressCellFilled(value: string) {
  return value !== "" && !negativeCellPattern.test(value);
}

const progressHeaderPattern =
  /contact|phase|round|interview|screen|onsite|on-site|final|assessment|\btest\b|\boa\b|take[- ]?home|offer|stage\s*\d/i;

/**
 * Suggests progress columns from header names. Stages only go up from left to
 * right, so "Phase 1, Phase 2, Final Interview" becomes Interview 1, 2, 3 even
 * though "Final Interview" alone reads as a first interview.
 */
export function guessProgressColumns(
  headers: string[],
  mapping: ColumnMapping,
): ProgressColumn[] {
  const mapped = new Set(Object.values(mapping));
  const progress: ProgressColumn[] = [];
  let previous = stageRank.Applied;

  headers.forEach((header, column) => {
    if (mapped.has(column) || !progressHeaderPattern.test(header)) return;

    const guess = guessStage(header);
    // Assessments are tracked separately from the interview path, so they
    // neither follow nor advance the sequence.
    if (guess.recognized && guess.value === "Assessment") {
      progress.push({ column, stage: "Assessment" });
      return;
    }

    let stage: Stage;
    if (guess.recognized && guess.value === "Offer") {
      stage = "Offer";
    } else {
      // Unnamed rounds ("Phase 1") start at a recruiter screen, then count up
      // through the interviews.
      const fallback =
        progress.length > 0
          ? stageRank["Interview 1"]
          : stageRank["Recruiter screen"];
      const suggested =
        guess.recognized && guess.value !== "Applied"
          ? stageRank[guess.value]
          : fallback;
      const next = Math.max(previous + 1, suggested);
      stage = stages[Math.min(next, stageRank["Interview 4+"])];
    }

    progress.push({ column, stage });
    previous = stageRank[stage];
  });

  return progress;
}
