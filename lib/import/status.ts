import { stages, type Outcome, type Stage } from "@/lib/applications";
import { normalizeValue } from "@/lib/import/values";

export type Guess<T> = { value: T; recognized: boolean };

function interviewRound(round: number): Stage {
  if (round <= 1) return "Interview 1";
  if (round === 2) return "Interview 2";
  if (round === 3) return "Interview 3";
  return "Interview 4+";
}

/** Best guess for a free-text stage. `recognized` is false for the fallback. */
export function guessStage(raw: string): Guess<Stage> {
  const value = normalizeValue(raw);
  const exact = stages.find((stage) => normalizeValue(stage) === value);
  if (exact) return { value: exact, recognized: true };
  if (value === "interview") return { value: "Interview 1", recognized: true };

  const round =
    value.match(/interview\D{0,10}(\d+)/) ??
    value.match(/(\d+)(?:st|nd|rd|th)?\s*(?:round|interview)/);
  if (round)
    return { value: interviewRound(Number(round[1])), recognized: true };

  if (/offer|hired|accepted/.test(value)) {
    return { value: "Offer", recognized: true };
  }
  if (/interview|onsite|on-site|final|technical|panel|superday/.test(value)) {
    return { value: "Interview 1", recognized: true };
  }
  if (/recruiter|screen|phone call|hr call|intro call/.test(value)) {
    return { value: "Recruiter screen", recognized: true };
  }
  if (
    /assessment|\btest\b|\boa\b|take[- ]?home|hackerrank|codility|case study|challenge/.test(
      value,
    )
  ) {
    return { value: "Assessment", recognized: true };
  }
  if (
    /^(applied|submitted|sent|pending|waiting|in review|under review|no response)$/.test(
      value,
    )
  ) {
    return { value: "Applied", recognized: true };
  }

  return { value: "Applied", recognized: false };
}

/** Best guess for a free-text result. `recognized` is false for the fallback. */
export function guessOutcome(raw: string): Guess<Outcome> {
  const value = normalizeValue(raw);

  if (
    /withdr[ae]w|withdrawn|i declined|declined offer|pulled out/.test(value)
  ) {
    return { value: "Withdrawn", recognized: true };
  }
  if (
    /reject|declined|not selected|unsuccessful|not moving forward|no longer|turned down|closed/.test(
      value,
    )
  ) {
    return { value: "Rejected", recognized: true };
  }
  if (/offer|hired|accepted/.test(value)) {
    return { value: "Offer", recognized: true };
  }
  if (
    /^(active|open|in progress|ongoing|applied|submitted|pending|waiting|in review|under review|no response)$/.test(
      value,
    )
  ) {
    return { value: "Active", recognized: true };
  }
  // Any recognizable stage means the application is still in progress.
  if (guessStage(raw).recognized) return { value: "Active", recognized: true };

  return { value: "Active", recognized: false };
}

/** Each different value in a column, keyed by its normalized form. */
export function distinctValues(rows: string[][], column: number | null) {
  if (column === null) return [];
  const seen = new Map<string, string>();
  for (const row of rows) {
    const raw = row[column]?.trim() ?? "";
    const key = normalizeValue(raw);
    if (key && !seen.has(key)) seen.set(key, raw);
  }
  return [...seen].map(([key, raw]) => ({ key, raw }));
}
