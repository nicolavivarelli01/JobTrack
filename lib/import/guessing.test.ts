import { describe, expect, it } from "vitest";

import { guessMapping } from "@/lib/import/fields";
import { guessProgressColumns } from "@/lib/import/progress";
import { guessOutcome, guessStage } from "@/lib/import/status";

describe("guessMapping", () => {
  it("matches headers regardless of case and punctuation", () => {
    const mapping = guessMapping([
      "Job Title",
      "COMPANY",
      "Apply Date",
      "Link",
    ]);
    expect(mapping.role).toBe(0);
    expect(mapping.company).toBe(1);
    expect(mapping.appliedAt).toBe(2);
    expect(mapping.jobUrl).toBe(3);
    expect(mapping.notes).toBeNull();
  });

  it("maps a lone Status column to both stage and result", () => {
    const mapping = guessMapping(["Company", "Status"]);
    expect(mapping.stage).toBe(1);
    expect(mapping.outcome).toBe(1);
  });

  it("prefers a specific column over Status", () => {
    const mapping = guessMapping(["Stage", "Status"]);
    expect(mapping.stage).toBe(0);
    expect(mapping.outcome).toBe(1);
  });
});

describe("guessStage and guessOutcome", () => {
  it.each([
    ["OA", "Assessment"],
    ["Phone screen", "Recruiter screen"],
    ["2nd round interview", "Interview 2"],
    ["Interview #4", "Interview 4+"],
    ["Final round", "Interview 1"],
    ["Offer accepted", "Offer"],
  ])("reads %s as stage %s", (raw, stage) => {
    expect(guessStage(raw)).toEqual({ value: stage, recognized: true });
  });

  it.each([
    ["Not selected", "Rejected"],
    ["Declined", "Rejected"],
    ["Withdrew", "Withdrawn"],
    ["Under review", "Active"],
    ["Phone screen", "Active"],
  ])("reads %s as result %s", (raw, outcome) => {
    expect(guessOutcome(raw)).toEqual({ value: outcome, recognized: true });
  });

  it("flags values it can't place", () => {
    expect(guessStage("Rejected").recognized).toBe(false);
    expect(guessOutcome("Ghosted").recognized).toBe(false);
  });
});

describe("guessProgressColumns", () => {
  const stagesFor = (headers: string[]) =>
    guessProgressColumns(headers, guessMapping(headers)).map(
      ({ column, stage }) => `${headers[column]} → ${stage}`,
    );

  it("counts unnamed rounds upward from a recruiter screen", () => {
    expect(
      stagesFor([
        "Company",
        "Role",
        "Apply Date",
        "1st contact",
        "Phase1",
        "Phase2",
        "Phase 3",
        "Final Interview",
      ]),
    ).toEqual([
      "1st contact → Recruiter screen",
      "Phase1 → Interview 1",
      "Phase2 → Interview 2",
      "Phase 3 → Interview 3",
      "Final Interview → Interview 4+",
    ]);
  });

  it("keeps assessments out of the interview sequence", () => {
    expect(
      stagesFor([
        "Company",
        "Date applied",
        "Phone screen",
        "Test",
        "Interview 1",
        "Interview 2",
        "Onsite",
        "Offer",
      ]),
    ).toEqual([
      "Phone screen → Recruiter screen",
      "Test → Assessment",
      "Interview 1 → Interview 1",
      "Interview 2 → Interview 2",
      "Onsite → Interview 3",
      "Offer → Offer",
    ]);
  });

  it("ignores columns already mapped to a field", () => {
    expect(stagesFor(["Company", "Status", "Interview date"])).toEqual([]);
  });
});
