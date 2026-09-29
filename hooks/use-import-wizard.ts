"use client";

import { useMemo, useState } from "react";

import {
  stageRank,
  stages,
  type Application,
  type Outcome,
  type Stage,
} from "@/lib/applications";
import { sheetFromCsv } from "@/lib/import/csv";
import {
  guessMapping,
  importFields,
  isRequiredField,
} from "@/lib/import/fields";
import { buildImportPreview } from "@/lib/import/preview";
import { guessProgressColumns } from "@/lib/import/progress";
import {
  loadImportSettings,
  saveImportSettings,
  type DateOrderChoice,
} from "@/lib/import/saved-settings";
import { distinctValues, guessOutcome, guessStage } from "@/lib/import/status";
import type {
  ColumnMapping,
  ImportField,
  ProgressColumn,
  SheetData,
  ValueMap,
} from "@/lib/import/types";
import { detectDateOrder } from "@/lib/import/values";
import { todayInputValue } from "@/lib/dates";

const dateFields: ImportField[] = [
  "appliedAt",
  "responseAt",
  "rejectedAt",
  "interviewAt",
];
const emptyHeaders: string[] = [];
const emptyRows: string[][] = [];

function isExcelFile(file: File) {
  return (
    /\.xlsx$/i.test(file.name) ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

async function readSheet(file: File): Promise<SheetData> {
  if (!isExcelFile(file)) return sheetFromCsv(await file.text());
  const { readXlsx } = await import("@/lib/import/xlsx");
  return readXlsx(await file.arrayBuffer());
}

/**
 * State for the import dialog: the loaded file, the user's mapping choices,
 * and the live preview they produce.
 */
export function useImportWizard(existingApplications: Application[]) {
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [progressColumns, setProgressColumns] = useState<ProgressColumn[]>([]);
  const [dateOrderChoice, setDateOrderChoice] =
    useState<DateOrderChoice>("auto");
  const [stageOverrides, setStageOverrides] = useState<ValueMap<Stage>>({});
  const [outcomeOverrides, setOutcomeOverrides] = useState<ValueMap<Outcome>>(
    {},
  );
  const [useFallbackDate, setUseFallbackDate] = useState(false);
  const [fallbackDate, setFallbackDate] = useState(todayInputValue);
  const [appendUnmappedToNotes, setAppendUnmappedToNotes] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const headers = sheet?.headers ?? emptyHeaders;
  const rows = sheet?.rows ?? emptyRows;

  async function loadFile(file: File) {
    setFileError(null);
    if (/\.xls$/i.test(file.name)) {
      setFileError(
        "Old .xls files aren't supported. Open it in Excel and save as .xlsx or .csv.",
      );
      return;
    }

    let parsed: SheetData;
    setReading(true);
    try {
      parsed = await readSheet(file);
    } catch {
      setFileError("This file could not be read.");
      return;
    } finally {
      setReading(false);
    }

    if (parsed.rows.length === 0) {
      setFileError(
        "No applications found. The file needs a header row followed by at least one row of data.",
      );
      return;
    }

    const saved = loadImportSettings(parsed.headers);
    const nextMapping = saved?.mapping ?? guessMapping(parsed.headers);

    setFileName(file.name);
    setSheet(parsed);
    setMapping(nextMapping);
    setProgressColumns(
      saved?.progressColumns ??
        guessProgressColumns(parsed.headers, nextMapping),
    );
    setDateOrderChoice(saved?.dateOrder ?? "auto");
    setStageOverrides(saved?.stageOverrides ?? {});
    setOutcomeOverrides(saved?.outcomeOverrides ?? {});
  }

  function resetFile() {
    setFileName("");
    setSheet(null);
    setMapping(null);
    setFileError(null);
  }

  function setColumn(field: ImportField, column: number | null) {
    setMapping((current) =>
      current ? { ...current, [field]: column } : current,
    );
  }

  function updateProgressColumn(
    index: number,
    update: Partial<ProgressColumn>,
  ) {
    setProgressColumns((current) =>
      current.map((progress, position) =>
        position === index ? { ...progress, ...update } : progress,
      ),
    );
  }

  function removeProgressColumn(index: number) {
    setProgressColumns((current) =>
      current.filter((_, position) => position !== index),
    );
  }

  /** Adds the first unused column, one stage after the previous row. */
  function addProgressColumn() {
    setProgressColumns((current) => {
      const used = new Set(current.map((progress) => progress.column));
      const column = headers.findIndex((_, index) => !used.has(index));
      if (column === -1) return current;

      const last = current.at(-1)?.stage;
      const next = last ? stageRank[last] + 1 : stageRank["Recruiter screen"];
      return [
        ...current,
        { column, stage: stages[Math.min(next, stages.length - 1)] },
      ];
    });
  }

  function setStageValue(key: string, stage: Stage) {
    setStageOverrides((current) => ({ ...current, [key]: stage }));
  }

  function setOutcomeValue(key: string, outcome: Outcome) {
    setOutcomeOverrides((current) => ({ ...current, [key]: outcome }));
  }

  // Red cells only mean "rejected" inside progress columns.
  const redCellCounts = useMemo(() => {
    const progress = new Set(progressColumns.map((item) => item.column));
    let used = 0;
    let ignored = 0;
    for (const key of sheet?.redCells ?? []) {
      if (progress.has(Number(key.split(":")[1]))) used += 1;
      else ignored += 1;
    }
    return { used, ignored };
  }, [progressColumns, sheet]);

  const detectedDateOrder = useMemo(() => {
    if (!mapping) return detectDateOrder([]);
    const columns = [
      ...dateFields.map((field) => mapping[field]),
      ...progressColumns.map((progress) => progress.column),
    ].filter((column): column is number => column !== null);
    return detectDateOrder(
      columns.flatMap((column) => rows.map((row) => row[column] ?? "")),
    );
  }, [mapping, progressColumns, rows]);

  const dateOrder =
    dateOrderChoice === "auto" ? detectedDateOrder.order : dateOrderChoice;

  // One table per source column used for stage and/or result, so a single
  // "Status" column shows both choices side by side.
  const statusColumns = useMemo(() => {
    if (!mapping) return [];
    const columns = new Set(
      [mapping.stage, mapping.outcome].filter(
        (column): column is number => column !== null,
      ),
    );
    return [...columns].map((column) => ({
      column,
      showsStage: mapping.stage === column,
      showsOutcome: mapping.outcome === column,
      values: distinctValues(rows, column),
    }));
  }, [mapping, rows]);

  const stageValues = useMemo(() => {
    const values: ValueMap<Stage> = {};
    for (const { key, raw } of distinctValues(rows, mapping?.stage ?? null)) {
      values[key] = stageOverrides[key] ?? guessStage(raw).value;
    }
    return values;
  }, [mapping, rows, stageOverrides]);

  const outcomeValues = useMemo(() => {
    const values: ValueMap<Outcome> = {};
    for (const { key, raw } of distinctValues(rows, mapping?.outcome ?? null)) {
      values[key] = outcomeOverrides[key] ?? guessOutcome(raw).value;
    }
    return values;
  }, [mapping, rows, outcomeOverrides]);

  const preview = useMemo(() => {
    if (!mapping || !sheet) return null;
    return buildImportPreview(
      sheet,
      {
        mapping,
        progressColumns,
        dateOrder,
        stageValues,
        outcomeValues,
        fallbackAppliedAt: useFallbackDate ? fallbackDate : undefined,
        appendUnmappedToNotes,
        skipDuplicates,
      },
      existingApplications,
    );
  }, [
    appendUnmappedToNotes,
    dateOrder,
    existingApplications,
    fallbackDate,
    mapping,
    outcomeValues,
    progressColumns,
    sheet,
    skipDuplicates,
    stageValues,
    useFallbackDate,
  ]);

  // Spreadsheets often export dozens of blank placeholder columns
  // ("Column 1", "Column 2", …), so only count columns that hold data.
  const unmappedColumnCount = mapping
    ? headers.filter(
        (_, column) =>
          !Object.values(mapping).includes(column) &&
          !progressColumns.some((progress) => progress.column === column) &&
          rows.some((row) => row[column]),
      ).length
    : 0;

  const missingRequired = mapping
    ? importFields.filter(
        (field) =>
          isRequiredField(field) &&
          mapping[field.key] === null &&
          !(field.key === "appliedAt" && useFallbackDate),
      )
    : [];

  function rememberSettings() {
    if (!mapping) return;
    saveImportSettings(headers, {
      mapping,
      progressColumns,
      dateOrder: dateOrderChoice,
      stageOverrides,
      outcomeOverrides,
    });
  }

  return {
    file: {
      name: fileName,
      error: fileError,
      reading,
      load: loadFile,
      reset: resetFile,
    },
    sheet,
    headers,
    rows,
    mapping,
    setColumn,
    progressColumns,
    addProgressColumn,
    updateProgressColumn,
    removeProgressColumn,
    redCellCounts,
    dateOrderChoice,
    setDateOrderChoice,
    detectedDateOrder,
    useFallbackDate,
    setUseFallbackDate,
    fallbackDate,
    setFallbackDate,
    statusColumns,
    stageOverrides,
    outcomeOverrides,
    stageValues,
    outcomeValues,
    setStageValue,
    setOutcomeValue,
    appendUnmappedToNotes,
    setAppendUnmappedToNotes,
    unmappedColumnCount,
    skipDuplicates,
    setSkipDuplicates,
    preview,
    missingRequired,
    rememberSettings,
  };
}

export type ImportWizard = ReturnType<typeof useImportWizard>;
