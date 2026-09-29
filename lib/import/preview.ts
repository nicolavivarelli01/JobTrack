import {
  hasPositiveResponse,
  stageRank,
  type Application,
  type ApplicationDraft,
  type Outcome,
  type Stage,
} from "@/lib/applications";
import { fieldLabel } from "@/lib/import/fields";
import { isProgressCellFilled } from "@/lib/import/progress";
import { guessOutcome } from "@/lib/import/status";
import {
  cellKey,
  type ColumnMapping,
  type DateOrder,
  type ImportField,
  type ImportOptions,
  type ImportPreview,
  type ProgressColumn,
  type SheetData,
} from "@/lib/import/types";
import {
  normalizeUrl,
  normalizeValue,
  parseBoolean,
  parseDateTimeValue,
  parseDateValue,
} from "@/lib/import/values";

// Mirrors the length checks in the database, so one long cell skips its row
// instead of failing the whole insert.
const textLimits: Partial<Record<ImportField, number>> = {
  company: 200,
  role: 250,
  source: 200,
  location: 200,
  jobUrl: 2000,
  interviewLink: 2000,
  interviewDetails: 5000,
};
const notesLimit = 5000;

export function duplicateKey(
  application: Pick<ApplicationDraft, "company" | "role" | "appliedAt">,
) {
  return [application.company, application.role, application.appliedAt]
    .map(normalizeValue)
    .join("|");
}

// Excel users often link the job posting from the role or company text
// instead of keeping a URL column.
function rowLink(sheet: SheetData, row: number, mapping: ColumnMapping) {
  const preferred = [mapping.role, mapping.company].filter(
    (column): column is number => column !== null,
  );
  const others = sheet.headers
    .map((_, column) => column)
    .filter((column) => column !== mapping.interviewLink);

  for (const column of [...preferred, ...others]) {
    const link = sheet.links.get(cellKey(row, column));
    if (link) return link;
  }
  return undefined;
}

type Progress = {
  stage: Stage;
  outcome: Outcome;
  reachedAssessment: boolean;
  /** First date found in a reached round, used as the response date. */
  firstDate?: string;
  /** True when a red cell or "Rejected"/"Withdrew" ended the process. */
  ended: boolean;
  endedOn?: string;
};

/**
 * Walks the progress columns left to right. The furthest filled column is the
 * highest stage reached; a red cell or a "Rejected"/"Withdrew" cell ends the
 * process there instead of counting as a round.
 */
function readProgress(
  sheet: SheetData,
  row: number,
  progressColumns: ProgressColumn[],
  dateOrder: DateOrder,
  start: { stage: Stage; outcome: Outcome },
): Progress {
  const progress: Progress = {
    ...start,
    reachedAssessment: false,
    ended: false,
  };

  for (const { column, stage } of progressColumns) {
    const value = sheet.rows[row][column]?.trim() ?? "";
    const date = parseDateValue(value, dateOrder) ?? undefined;

    if (sheet.redCells.has(cellKey(row, column))) {
      progress.outcome = "Rejected";
      progress.ended = true;
      progress.endedOn ??= date;
      continue;
    }
    if (!isProgressCellFilled(value)) continue;

    const ending = guessOutcome(value);
    if (
      ending.recognized &&
      ending.value !== "Active" &&
      ending.value !== "Offer"
    ) {
      progress.outcome = ending.value;
      progress.ended = true;
      progress.endedOn ??= date;
      continue;
    }
    if (ending.recognized && ending.value === "Offer")
      progress.outcome = "Offer";

    progress.firstDate ??= date;
    if (stage === "Assessment") progress.reachedAssessment = true;
    if (stageRank[stage] > stageRank[progress.stage]) progress.stage = stage;
  }

  return progress;
}

function unmappedColumnNotes(
  headers: string[],
  row: string[],
  mappedColumns: Set<number>,
) {
  return headers
    .map((header, column) => ({ header, column, value: row[column]?.trim() }))
    .filter(({ column, value }) => !mappedColumns.has(column) && value)
    .map(({ header, value }) => `${header || "Column"}: ${value}`);
}

/**
 * Turns spreadsheet rows into application drafts using the chosen mapping.
 * Rows that can't be imported land in `errors` with a reason, and rows that
 * match an existing application (or an earlier row) land in `duplicates`.
 */
export function buildImportPreview(
  sheet: SheetData,
  options: ImportOptions,
  existing: Application[],
): ImportPreview {
  const { headers, rows } = sheet;
  const { mapping, dateOrder } = options;
  const mappedColumns = new Set([
    ...Object.values(mapping).filter(
      (column): column is number => column !== null,
    ),
    ...options.progressColumns.map((progress) => progress.column),
  ]);
  const seen = new Set(existing.map(duplicateKey));
  const preview: ImportPreview = { rows: [], errors: [], duplicates: [] };

  rows.forEach((row, index) => {
    // The header is line 1, so the first data row is line 2 in a spreadsheet.
    const rowNumber = index + 2;
    const warnings: string[] = [];
    const cell = (field: ImportField) => {
      const column = mapping[field];
      return column === null ? "" : (row[column]?.trim() ?? "");
    };
    const date = (field: ImportField) => {
      const raw = cell(field);
      if (!raw) return undefined;
      const parsed = parseDateValue(raw, dateOrder);
      if (!parsed) {
        warnings.push(
          `${fieldLabel(field)} "${raw}" is not a recognizable date`,
        );
      }
      return parsed ?? undefined;
    };
    const skip = (message: string) =>
      preview.errors.push({ rowNumber, message });

    const company = cell("company");
    const role = cell("role");
    if (!company || !role) {
      skip(
        `Missing ${!company && !role ? "company and role" : !company ? "company" : "role"}`,
      );
      return;
    }

    let appliedAt = date("appliedAt");
    if (!appliedAt && options.fallbackAppliedAt) {
      appliedAt = options.fallbackAppliedAt;
      warnings.push("Applied date missing, used the fallback date");
    }
    if (!appliedAt) {
      skip(
        cell("appliedAt")
          ? `Applied date "${cell("appliedAt")}" is not a recognizable date`
          : "Missing applied date",
      );
      return;
    }

    const rawStage = normalizeValue(cell("stage"));
    const rawOutcome = normalizeValue(cell("outcome"));
    const progress = readProgress(
      sheet,
      index,
      options.progressColumns,
      dateOrder,
      {
        stage: (rawStage && options.stageValues[rawStage]) || "Applied",
        outcome: (rawOutcome && options.outcomeValues[rawOutcome]) || "Active",
      },
    );

    let { stage, outcome } = progress;
    if (outcome === "Offer") stage = "Offer";
    if (stage === "Offer") outcome = "Offer";

    const hadAssessment =
      stage === "Assessment" ||
      progress.reachedAssessment ||
      (mapping.hadAssessment !== null && parseBoolean(cell("hadAssessment")));
    const positive = hasPositiveResponse({ stage, outcome, hadAssessment });

    const responseAt = date("responseAt") ?? progress.firstDate;
    if (responseAt && !positive && cell("responseAt")) {
      warnings.push(
        "Response date ignored because nothing shows the application got past Applied",
      );
    }

    // A rejection marked in a progress column without its own date is dated
    // to the application. One from a status column falls back to the
    // response date first, like the local-data migration.
    const rejectionDate = date("rejectedAt");
    const rejectedAt =
      outcome !== "Rejected"
        ? undefined
        : rejectionDate ||
          progress.endedOn ||
          (progress.ended ? appliedAt : responseAt || appliedAt);

    const interviewRaw = cell("interviewAt");
    const interviewAt =
      parseDateTimeValue(interviewRaw, dateOrder) ?? undefined;
    if (interviewRaw && !interviewAt) {
      warnings.push(
        `Interview date "${interviewRaw}" is not a recognizable date`,
      );
    }

    let notes = cell("notes");
    if (options.appendUnmappedToNotes) {
      notes = [notes, ...unmappedColumnNotes(headers, row, mappedColumns)]
        .filter(Boolean)
        .join("\n");
    }
    if (notes.length > notesLimit) {
      notes = notes.slice(0, notesLimit);
      warnings.push(`Notes were shortened to ${notesLimit} characters`);
    }

    const draft: ApplicationDraft = {
      company,
      role,
      stage,
      outcome,
      companyStatus: cell("companyStatus") || undefined,
      appliedAt,
      responseAt: positive ? responseAt : undefined,
      source: cell("source") || undefined,
      location: cell("location") || undefined,
      jobUrl:
        normalizeUrl(cell("jobUrl")) ||
        rowLink(sheet, index, mapping) ||
        undefined,
      notes: notes || undefined,
      interviewAt,
      interviewLink: normalizeUrl(cell("interviewLink")) || undefined,
      interviewDetails: cell("interviewDetails") || undefined,
      rejectedAt,
      hadAssessment,
    };

    const tooLong = (
      Object.entries(textLimits) as [ImportField, number][]
    ).find(([field, limit]) => {
      const value = draft[field];
      return typeof value === "string" && value.length > limit;
    });
    if (tooLong) {
      skip(`${fieldLabel(tooLong[0])} is longer than ${tooLong[1]} characters`);
      return;
    }

    const key = duplicateKey(draft);
    if (seen.has(key) && options.skipDuplicates) {
      preview.duplicates.push({ rowNumber, label: `${company} · ${role}` });
      return;
    }
    seen.add(key);

    preview.rows.push({ rowNumber, draft, warnings });
  });

  return preview;
}
