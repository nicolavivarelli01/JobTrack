import { describe, expect, it } from "vitest";

import type { Application } from "@/lib/applications";
import { guessMapping } from "@/lib/import/fields";
import { buildImportPreview } from "@/lib/import/preview";
import { guessProgressColumns } from "@/lib/import/progress";
import {
  cellKey,
  type ImportOptions,
  type SheetData,
} from "@/lib/import/types";

function sheet(
  headers: string[],
  rows: string[][],
  extras: Partial<SheetData> = {},
): SheetData {
  return { headers, rows, redCells: new Set(), links: new Map(), ...extras };
}

function preview(
  data: SheetData,
  options: Partial<ImportOptions> = {},
  existing: Application[] = [],
) {
  const mapping = options.mapping ?? guessMapping(data.headers);
  return buildImportPreview(
    data,
    {
      mapping,
      progressColumns:
        options.progressColumns ?? guessProgressColumns(data.headers, mapping),
      dateOrder: "mdy",
      stageValues: {},
      outcomeValues: {},
      appendUnmappedToNotes: false,
      skipDuplicates: true,
      ...options,
    },
    existing,
  );
}

const trackerHeaders = [
  "Company",
  "Role",
  "Apply Date",
  "Mentioned OPT",
  "1st contact",
  "Phase1",
  "Phase2",
];

describe("buildImportPreview", () => {
  it("maps status values and applies the offer rule", () => {
    const result = preview(
      sheet(
        ["Company", "Role", "Date applied", "Status"],
        [
          ["Acme", "Engineer", "2025-09-01", "rejected"],
          ["Beta", "Analyst", "2025-09-02", "offer"],
        ],
      ),
      {
        stageValues: { rejected: "Applied", offer: "Offer" },
        outcomeValues: { rejected: "Rejected", offer: "Offer" },
      },
    );

    const [rejected, offer] = result.rows.map((row) => row.draft);
    expect(rejected).toMatchObject({
      stage: "Applied",
      outcome: "Rejected",
      rejectedAt: "2025-09-01",
    });
    expect(offer).toMatchObject({ stage: "Offer", outcome: "Offer" });
  });

  it("skips rows without company, role, or a readable applied date", () => {
    const result = preview(
      sheet(
        ["Company", "Role", "Date applied"],
        [
          ["", "Engineer", "2025-09-01"],
          ["Acme", "Engineer", ""],
          ["Acme", "Engineer", "someday"],
        ],
      ),
    );

    expect(result.rows).toHaveLength(0);
    expect(result.errors.map((error) => error.message)).toEqual([
      "Missing company",
      "Missing applied date",
      'Applied date "someday" is not a recognizable date',
    ]);
  });

  it("uses the fallback date when asked", () => {
    const result = preview(
      sheet(["Company", "Role", "Date applied"], [["Acme", "Engineer", ""]]),
      { fallbackAppliedAt: "2025-01-15" },
    );
    expect(result.rows[0].draft.appliedAt).toBe("2025-01-15");
    expect(result.rows[0].warnings).toHaveLength(1);
  });

  it("sets the stage from the furthest filled progress column", () => {
    const result = preview(
      sheet(trackerHeaders, [
        ["A", "DS", "08/27/26", "Yes", "09/01/26", "09/10/26", ""],
        ["B", "DS", "08/27/26", "No", "x", "No", ""],
        ["C", "DS", "08/27/26", "", "Yes", "Yes", "Rejected"],
        ["D", "DS", "08/27/26", "", "", "", ""],
      ]),
    );

    const drafts = result.rows.map((row) => row.draft);
    expect(drafts[0]).toMatchObject({
      stage: "Interview 1",
      outcome: "Active",
      responseAt: "2026-09-01",
    });
    expect(drafts[1]).toMatchObject({ stage: "Recruiter screen" });
    expect(drafts[2]).toMatchObject({
      stage: "Interview 1",
      outcome: "Rejected",
      rejectedAt: "2026-08-27",
    });
    expect(drafts[3]).toMatchObject({ stage: "Applied", outcome: "Active" });
  });

  it("treats red progress cells as rejections dated to the application", () => {
    const result = preview(
      sheet(
        trackerHeaders,
        [
          ["A", "DS", "08/01/26", "", "", "", ""],
          ["B", "DS", "08/01/26", "", "08/05/26", "08/10/26", ""],
          ["C", "DS", "08/01/26", "", "08/06/26", "", ""],
          ["D", "DS", "08/01/26", "", "", "", ""],
        ],
        {
          redCells: new Set([
            cellKey(0, 4),
            cellKey(1, 6),
            cellKey(2, 4),
            cellKey(3, 0),
          ]),
        },
      ),
    );

    const drafts = result.rows.map((row) => row.draft);
    expect(drafts[0]).toMatchObject({
      stage: "Applied",
      outcome: "Rejected",
      rejectedAt: "2026-08-01",
    });
    expect(drafts[1]).toMatchObject({
      stage: "Interview 1",
      outcome: "Rejected",
      rejectedAt: "2026-08-01",
    });
    // A date written in the red cell itself wins.
    expect(drafts[2].rejectedAt).toBe("2026-08-06");
    // Red outside progress columns means nothing.
    expect(drafts[3].outcome).toBe("Active");
  });

  it("uses a hyperlink on the role as the job URL", () => {
    const result = preview(
      sheet(["Company", "Role", "Date applied"], [["A", "DS", "2025-09-01"]], {
        links: new Map([[cellKey(0, 1), "https://jobs.example.com/1"]]),
      }),
    );
    expect(result.rows[0].draft.jobUrl).toBe("https://jobs.example.com/1");
  });

  it("skips duplicates of existing applications and earlier rows", () => {
    const existing = {
      id: "1",
      company: "Acme",
      role: "Engineer",
      appliedAt: "2025-09-01",
    } as Application;
    const result = preview(
      sheet(
        ["Company", "Role", "Date applied"],
        [
          ["acme ", "engineer", "09/01/2025"],
          ["Beta", "Analyst", "2025-09-02"],
          ["Beta", "Analyst", "2025-09-02"],
        ],
      ),
      {},
      [existing],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.duplicates.map((row) => row.rowNumber)).toEqual([2, 4]);
  });

  it("warns when a response date can't be used", () => {
    const result = preview(
      sheet(
        ["Company", "Role", "Date applied", "Response date"],
        [["A", "DS", "2025-09-01", "2025-09-05"]],
      ),
    );
    expect(result.rows[0].draft.responseAt).toBeUndefined();
    expect(result.rows[0].warnings[0]).toMatch(/Response date ignored/);
  });

  it("can keep unmatched columns in the notes", () => {
    const result = preview(
      sheet(
        ["Company", "Role", "Date applied", "Salary"],
        [["A", "DS", "2025-09-01", "100k"]],
      ),
      { appendUnmappedToNotes: true },
    );
    expect(result.rows[0].draft.notes).toBe("Salary: 100k");
  });
});
