import type { ApplicationDraft, Outcome, Stage } from "@/lib/applications";

export type ImportField = keyof ApplicationDraft;

/** Source column index for each field, or null when the field is not imported. */
export type ColumnMapping = Record<ImportField, number | null>;

export type DateOrder = "mdy" | "dmy";

/** Normalized cell value → what it means, e.g. "ghosted" → "Rejected". */
export type ValueMap<T extends string> = Record<string, T>;

/**
 * A column that records reaching a stage, for spreadsheets that track
 * progress with one column per round ("1st contact", "Phase 1", …) filled in
 * from left to right instead of a single status column.
 */
export type ProgressColumn = { column: number; stage: Stage };

/**
 * A parsed spreadsheet. `redCells` and `links` are keyed by
 * "rowIndex:columnIndex" (0-based, data rows only). They are only filled for
 * Excel files, since CSV cannot store fills or hyperlinks.
 */
export type SheetData = {
  headers: string[];
  rows: string[][];
  redCells: Set<string>;
  links: Map<string, string>;
};

export function cellKey(row: number, column: number) {
  return `${row}:${column}`;
}

export type ImportOptions = {
  mapping: ColumnMapping;
  progressColumns: ProgressColumn[];
  dateOrder: DateOrder;
  stageValues: ValueMap<Stage>;
  outcomeValues: ValueMap<Outcome>;
  fallbackAppliedAt?: string;
  appendUnmappedToNotes: boolean;
  skipDuplicates: boolean;
};

export type ImportRow = {
  rowNumber: number;
  draft: ApplicationDraft;
  warnings: string[];
};

export type ImportPreview = {
  rows: ImportRow[];
  errors: { rowNumber: number; message: string }[];
  duplicates: { rowNumber: number; label: string }[];
};
