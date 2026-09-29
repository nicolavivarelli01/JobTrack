import type { Outcome, Stage } from "@/lib/applications";
import { importFields, normalizeHeader } from "@/lib/import/fields";
import type {
  ColumnMapping,
  DateOrder,
  ImportField,
  ProgressColumn,
  ValueMap,
} from "@/lib/import/types";

export type DateOrderChoice = DateOrder | "auto";

export type ImportSettings = {
  mapping: ColumnMapping;
  progressColumns: ProgressColumn[];
  dateOrder: DateOrderChoice;
  stageOverrides: ValueMap<Stage>;
  outcomeOverrides: ValueMap<Outcome>;
};

// Stored by header name rather than column index, so the mapping still applies
// if a newer export adds or reorders columns.
type StoredSettings = {
  mapping: Partial<Record<ImportField, string>>;
  progressColumns?: { header: string; stage: Stage }[];
  dateOrder: DateOrderChoice;
  stageOverrides: ValueMap<Stage>;
  outcomeOverrides: ValueMap<Outcome>;
};

// Settings are remembered per header layout, so re-importing a newer export
// from the same spreadsheet needs no setup.
function storageKey(headers: string[]) {
  return "jobtrack.csv-import.v1:" + headers.map(normalizeHeader).join("|");
}

export function loadImportSettings(headers: string[]): ImportSettings | null {
  let stored: StoredSettings;
  try {
    const saved = window.localStorage.getItem(storageKey(headers));
    if (!saved) return null;
    stored = JSON.parse(saved) as StoredSettings;
  } catch {
    return null;
  }

  const columnOf = (header: string | undefined) => {
    const index = header === undefined ? -1 : headers.indexOf(header);
    return index === -1 ? null : index;
  };

  return {
    mapping: Object.fromEntries(
      importFields.map((field) => [
        field.key,
        columnOf(stored.mapping[field.key]),
      ]),
    ) as ColumnMapping,
    progressColumns: (stored.progressColumns ?? []).flatMap(
      ({ header, stage }) => {
        const column = columnOf(header);
        return column === null ? [] : [{ column, stage }];
      },
    ),
    dateOrder: stored.dateOrder,
    stageOverrides: stored.stageOverrides,
    outcomeOverrides: stored.outcomeOverrides,
  };
}

export function saveImportSettings(
  headers: string[],
  settings: ImportSettings,
) {
  const stored: StoredSettings = {
    mapping: Object.fromEntries(
      importFields.flatMap((field) => {
        const column = settings.mapping[field.key];
        return column === null ? [] : [[field.key, headers[column]]];
      }),
    ),
    progressColumns: settings.progressColumns.map(({ column, stage }) => ({
      header: headers[column],
      stage,
    })),
    dateOrder: settings.dateOrder,
    stageOverrides: settings.stageOverrides,
    outcomeOverrides: settings.outcomeOverrides,
  };

  try {
    window.localStorage.setItem(storageKey(headers), JSON.stringify(stored));
  } catch {
    // Remembering the mapping is a convenience; the import already succeeded.
  }
}
