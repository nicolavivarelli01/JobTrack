import {
  stages,
  type Application,
  type ApplicationDraft,
  type Outcome,
  type Stage,
} from "@/lib/applications";

export type ImportField = keyof ApplicationDraft;

type ImportFieldDefinition = {
  key: ImportField;
  label: string;
  required?: boolean;
  aliases: string[];
};

// Aliases are compared after normalizeHeader, so casing, spaces, and
// punctuation do not matter. The first alias of each field is the label used
// by the CSV export, so exported files map back automatically.
export const importFields = [
  {
    key: "company",
    label: "Company",
    required: true,
    aliases: ["Company", "Company name", "Employer", "Organization", "Organisation", "Firm"],
  },
  {
    key: "role",
    label: "Role",
    required: true,
    aliases: ["Role", "Position", "Job title", "Title", "Job", "Position title", "Job role"],
  },
  {
    key: "appliedAt",
    label: "Applied date",
    required: true,
    aliases: ["Applied date", "Date applied", "Applied", "Applied on", "Application date", "Date", "Submitted", "Submitted on"],
  },
  {
    key: "stage",
    label: "Highest stage reached",
    aliases: ["Highest stage reached", "Stage", "Status", "Application status", "Pipeline stage"],
  },
  {
    key: "outcome",
    label: "Current result",
    aliases: ["Current result", "Result", "Outcome", "Status", "Application status"],
  },
  {
    key: "companyStatus",
    label: "Company status",
    aliases: ["Company status", "Portal status"],
  },
  {
    key: "responseAt",
    label: "First positive response date",
    aliases: ["First positive response date", "Response date", "Date of response"],
  },
  {
    key: "rejectedAt",
    label: "Rejection date",
    aliases: ["Rejection date", "Rejected date", "Rejected on", "Date rejected"],
  },
  {
    key: "hadAssessment",
    label: "Assessment included",
    aliases: ["Assessment included", "Assessment", "Had assessment", "Online assessment", "OA", "Take home"],
  },
  {
    key: "source",
    label: "Source",
    aliases: ["Source", "Via", "Platform", "Channel", "Job board", "Where applied"],
  },
  {
    key: "location",
    label: "Location",
    aliases: ["Location", "City", "Office", "Place"],
  },
  {
    key: "jobUrl",
    label: "Job posting URL",
    aliases: ["Job posting URL", "URL", "Link", "Job link", "Job URL", "Posting", "Posting URL"],
  },
  {
    key: "notes",
    label: "Notes",
    aliases: ["Notes", "Note", "Comments", "Comment", "Remarks"],
  },
  {
    key: "interviewAt",
    label: "Interview date and time",
    aliases: ["Interview date and time", "Interview date", "Interview time", "Next interview"],
  },
  {
    key: "interviewLink",
    label: "Interview link",
    aliases: ["Interview link", "Meeting link", "Zoom link"],
  },
  {
    key: "interviewDetails",
    label: "Interview details",
    aliases: ["Interview details", "Interview notes"],
  },
] as const satisfies readonly ImportFieldDefinition[];

export type ColumnMapping = Record<ImportField, number | null>;
export type DateOrder = "mdy" | "dmy";
export type ValueMap<T extends string> = Record<string, T>;

export type ImportOptions = {
  mapping: ColumnMapping;
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

export function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function detectDelimiter(text: string) {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;

  for (const candidate of candidates) {
    let count = 0;
    let quoted = false;
    for (const char of firstLine) {
      if (char === '"') quoted = !quoted;
      else if (!quoted && char === candidate) count += 1;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

// Undo the leading apostrophe the CSV export adds to keep spreadsheets from
// evaluating cells that start with =, +, -, or @.
function unescapeSpreadsheetValue(value: string) {
  return /^'[\t\r\n ]*[=+\-@]/.test(value) ? value.slice(1) : value;
}

/**
 * RFC 4180 parser that also accepts semicolon- and tab-separated files, which
 * is what Excel produces in locales that use a decimal comma.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows
    .map((cells) => cells.map((value) => unescapeSpreadsheetValue(value.trim())))
    .filter((cells) => cells.some((value) => value !== ""));
}

export function guessMapping(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map(normalizeHeader);
  const mapping = {} as ColumnMapping;

  for (const field of importFields) {
    const aliases = field.aliases.map(normalizeHeader);
    // Earlier aliases are stronger matches, so "Stage" wins over "Status".
    // A lone "Status" column maps to both stage and result on purpose.
    let match: number | null = null;
    for (const alias of aliases) {
      const index = normalizedHeaders.indexOf(alias);
      if (index !== -1) {
        match = index;
        break;
      }
    }
    mapping[field.key] = match;
  }

  return mapping;
}

function isValidDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function expandYear(year: number) {
  return year < 100 ? 2000 + year : year;
}

const isoDatePattern = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[T\s])/;
const numericDatePattern = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:$|[T\s,])/;

/** Returns a YYYY-MM-DD string, or null when the value is not a date. */
export function parseDateValue(raw: string, order: DateOrder): string | null {
  const value = raw.trim();
  if (!value) return null;

  const iso = value.match(isoDatePattern);
  if (iso) {
    const [year, month, day] = iso.slice(1, 4).map(Number);
    return isValidDate(year, month, day) ? formatDateParts(year, month, day) : null;
  }

  const numeric = value.match(numericDatePattern);
  if (numeric) {
    const [first, second, rawYear] = numeric.slice(1, 4).map(Number);
    const year = expandYear(rawYear);
    const [month, day] = order === "mdy" ? [first, second] : [second, first];
    return isValidDate(year, month, day) ? formatDateParts(year, month, day) : null;
  }

  // Excel date serials (days since 1899-12-30), e.g. 45566.
  if (/^\d{5}$/.test(value)) {
    const serial = Number(value);
    if (serial > 20000 && serial < 80000) {
      const date = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
      return formatDateParts(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
      );
    }
    return null;
  }

  // Written-out dates such as "Sep 5, 2025" or "5 September 2025". Require a
  // letter so plain numbers are never treated as timestamps.
  if (/[a-z]/i.test(value) && /\d{4}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return formatDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }
  }

  return null;
}

/**
 * Decides whether 03/04/2025 means March 4 or April 3 by looking for a value
 * where one side is greater than 12. `ambiguous` means every value could be
 * read either way, so the caller should ask.
 */
export function detectDateOrder(values: string[]): {
  order: DateOrder;
  ambiguous: boolean;
} {
  let monthFirst = false;
  let dayFirst = false;

  for (const value of values) {
    const match = value.trim().match(numericDatePattern);
    if (!match) continue;
    const first = Number(match[1]);
    const second = Number(match[2]);
    if (first > 12) dayFirst = true;
    if (second > 12) monthFirst = true;
  }

  if (dayFirst && !monthFirst) return { order: "dmy", ambiguous: false };
  if (monthFirst && !dayFirst) return { order: "mdy", ambiguous: false };
  const hasNumericDates = values.some((value) =>
    numericDatePattern.test(value.trim()),
  );
  return { order: "mdy", ambiguous: hasNumericDates };
}

function parseDateTimeValue(raw: string, order: DateOrder): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const day = parseDateValue(value, order);
  if (!day) return null;

  const time = value.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  let hours = time ? Number(time[1]) : 9;
  const minutes = time ? Number(time[2]) : 0;
  const meridiem = time?.[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, hours, minutes).toISOString();
}

function parseBoolean(raw: string) {
  return /^(yes|y|true|1|x|si|sì|✓|✔)$/i.test(raw.trim());
}

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value) ? `https://${value}` : value;
}

/** Best guess for a raw stage value. `recognized` is false for fallbacks. */
export function guessStage(raw: string): { value: Stage; recognized: boolean } {
  const value = normalizeValue(raw);
  const exact = stages.find((stage) => normalizeValue(stage) === value);
  if (exact) return { value: exact, recognized: true };
  if (value === "interview") return { value: "Interview 1", recognized: true };

  const round =
    value.match(/interview\D{0,10}(\d+)/) ??
    value.match(/(\d+)(?:st|nd|rd|th)?\s*(?:round|interview)/);
  if (round) {
    const number = Number(round[1]);
    const stage: Stage =
      number <= 1
        ? "Interview 1"
        : number === 2
          ? "Interview 2"
          : number === 3
            ? "Interview 3"
            : "Interview 4+";
    return { value: stage, recognized: true };
  }

  if (/offer|hired|accepted/.test(value)) return { value: "Offer", recognized: true };
  if (/interview|onsite|on-site|final|technical|panel|superday/.test(value)) {
    return { value: "Interview 1", recognized: true };
  }
  if (/recruiter|screen|phone call|hr call|intro call/.test(value)) {
    return { value: "Recruiter screen", recognized: true };
  }
  if (/assessment|\btest\b|\boa\b|take[- ]?home|hackerrank|codility|case study|challenge/.test(value)) {
    return { value: "Assessment", recognized: true };
  }
  if (/^(applied|submitted|sent|pending|waiting|in review|under review|no response)$/.test(value)) {
    return { value: "Applied", recognized: true };
  }

  return { value: "Applied", recognized: false };
}

/** Best guess for a raw result value. `recognized` is false for fallbacks. */
export function guessOutcome(raw: string): { value: Outcome; recognized: boolean } {
  const value = normalizeValue(raw);

  if (/withdr[ae]w|withdrawn|i declined|declined offer|pulled out/.test(value)) {
    return { value: "Withdrawn", recognized: true };
  }
  if (/reject|declined|not selected|unsuccessful|not moving forward|no longer|turned down|closed/.test(value)) {
    return { value: "Rejected", recognized: true };
  }
  if (/offer|hired|accepted/.test(value)) return { value: "Offer", recognized: true };
  if (/^(active|open|in progress|ongoing|applied|submitted|pending|waiting|in review|under review|no response)$/.test(value)) {
    return { value: "Active", recognized: true };
  }
  if (guessStage(raw).recognized) return { value: "Active", recognized: true };

  return { value: "Active", recognized: false };
}

export function distinctValues(rows: string[][], column: number | null) {
  if (column === null) return [];
  const seen = new Map<string, string>();
  for (const row of rows) {
    const raw = row[column]?.trim() ?? "";
    const key = normalizeValue(raw);
    if (key && !seen.has(key)) seen.set(key, raw);
  }
  return [...seen.entries()].map(([key, raw]) => ({ key, raw }));
}

export function duplicateKey(
  application: Pick<ApplicationDraft, "company" | "role" | "appliedAt">,
) {
  return [application.company, application.role, application.appliedAt]
    .map(normalizeValue)
    .join("|");
}

export function buildImportPreview(
  headers: string[],
  rows: string[][],
  options: ImportOptions,
  existing: Application[],
): ImportPreview {
  const { mapping, dateOrder } = options;
  const mappedColumns = new Set(
    Object.values(mapping).filter((column): column is number => column !== null),
  );
  const seen = new Set(existing.map(duplicateKey));
  const preview: ImportPreview = { rows: [], errors: [], duplicates: [] };

  rows.forEach((row, index) => {
    // Header is line 1, so the first data row is line 2 in a spreadsheet.
    const rowNumber = index + 2;
    const warnings: string[] = [];
    const cell = (field: ImportField) => {
      const column = mapping[field];
      return column === null ? "" : (row[column]?.trim() ?? "");
    };
    const date = (field: ImportField, label: string) => {
      const raw = cell(field);
      if (!raw) return undefined;
      const parsed = parseDateValue(raw, dateOrder);
      if (!parsed) warnings.push(`${label} "${raw}" is not a recognizable date`);
      return parsed ?? undefined;
    };

    const company = cell("company");
    const role = cell("role");
    if (!company || !role) {
      preview.errors.push({
        rowNumber,
        message: `Missing ${!company && !role ? "company and role" : !company ? "company" : "role"}`,
      });
      return;
    }

    let appliedAt = date("appliedAt", "Applied date");
    if (!appliedAt && options.fallbackAppliedAt) {
      appliedAt = options.fallbackAppliedAt;
      warnings.push("Applied date missing, used the fallback date");
    }
    if (!appliedAt) {
      preview.errors.push({
        rowNumber,
        message: cell("appliedAt")
          ? `Applied date "${cell("appliedAt")}" is not a recognizable date`
          : "Missing applied date",
      });
      return;
    }

    const rawStage = normalizeValue(cell("stage"));
    const rawOutcome = normalizeValue(cell("outcome"));
    let stage: Stage = (rawStage && options.stageValues[rawStage]) || "Applied";
    let outcome: Outcome =
      (rawOutcome && options.outcomeValues[rawOutcome]) || "Active";
    if (outcome === "Offer") stage = "Offer";
    if (stage === "Offer") outcome = "Offer";

    const hadAssessment =
      stage === "Assessment" ||
      (mapping.hadAssessment !== null && parseBoolean(cell("hadAssessment")));
    const hasPositiveResponse =
      hadAssessment || stage !== "Applied" || outcome === "Offer";
    const responseAt = date("responseAt", "Response date");
    const rejectedAt = date("rejectedAt", "Rejection date");

    const interviewRaw = cell("interviewAt");
    const interviewAt = parseDateTimeValue(interviewRaw, dateOrder) ?? undefined;
    if (interviewRaw && !interviewAt) {
      warnings.push(`Interview date "${interviewRaw}" is not a recognizable date`);
    }

    let notes = cell("notes");
    if (options.appendUnmappedToNotes) {
      const extras = headers
        .map((header, column) => ({ header, column, value: row[column]?.trim() }))
        .filter(({ column, value }) => !mappedColumns.has(column) && value)
        .map(({ header, value }) => `${header || "Column"}: ${value}`);
      if (extras.length) notes = [notes, ...extras].filter(Boolean).join("\n");
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
      responseAt: hasPositiveResponse ? responseAt : undefined,
      source: cell("source") || undefined,
      location: cell("location") || undefined,
      jobUrl: normalizeUrl(cell("jobUrl")) || undefined,
      notes: notes || undefined,
      interviewAt,
      interviewLink: normalizeUrl(cell("interviewLink")) || undefined,
      interviewDetails: cell("interviewDetails") || undefined,
      // Same fallback the local-data migration uses, so rejection trends
      // still place the rejection somewhere sensible.
      rejectedAt:
        outcome === "Rejected" ? rejectedAt || responseAt || appliedAt : undefined,
      hadAssessment,
    };

    const tooLong = (Object.entries(textLimits) as [ImportField, number][]).find(
      ([field, limit]) => {
        const value = draft[field];
        return typeof value === "string" && value.length > limit;
      },
    );
    if (tooLong) {
      const label = importFields.find((field) => field.key === tooLong[0])?.label;
      preview.errors.push({
        rowNumber,
        message: `${label} is longer than ${tooLong[1]} characters`,
      });
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
