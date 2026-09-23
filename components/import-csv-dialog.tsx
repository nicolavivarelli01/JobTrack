"use client";

import { DragEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  FileSpreadsheet,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  outcomes,
  stages,
  type Application,
  type ApplicationDraft,
  type Outcome,
  type Stage,
} from "@/lib/applications";
import {
  buildImportPreview,
  detectDateOrder,
  distinctValues,
  guessMapping,
  guessOutcome,
  guessProgressColumns,
  guessStage,
  importFields,
  isProgressCellFilled,
  normalizeHeader,
  parseCsv,
  type ColumnMapping,
  type DateOrder,
  type ImportField,
  type ProgressColumn,
  type ValueMap,
} from "@/lib/csv-import";

type DateOrderChoice = DateOrder | "auto";

type SavedImportSettings = {
  mapping: Partial<Record<ImportField, string>>;
  progressColumns?: { header: string; stage: Stage }[];
  dateOrder: DateOrderChoice;
  stageOverrides: ValueMap<Stage>;
  outcomeOverrides: ValueMap<Outcome>;
};

const savedSettingsPrefix = "jobtrack.csv-import.v1:";
const dateFields: ImportField[] = [
  "appliedAt",
  "responseAt",
  "rejectedAt",
  "interviewAt",
];
const dateOrderLabels: Record<DateOrder, string> = {
  mdy: "MM/DD/YYYY",
  dmy: "DD/MM/YYYY",
};

function settingsKey(headers: string[]) {
  return savedSettingsPrefix + headers.map(normalizeHeader).join("|");
}

// Mappings are remembered per header layout, so re-importing a newer export
// from the same spreadsheet or job board needs no setup.
function loadSavedSettings(headers: string[]): SavedImportSettings | null {
  try {
    const saved = window.localStorage.getItem(settingsKey(headers));
    return saved ? (JSON.parse(saved) as SavedImportSettings) : null;
  } catch {
    return null;
  }
}

function saveSettings(headers: string[], settings: SavedImportSettings) {
  try {
    window.localStorage.setItem(settingsKey(headers), JSON.stringify(settings));
  } catch {
    // Remembering the mapping is a convenience; importing still succeeded.
  }
}

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function ImportCsvDialog({
  open,
  onOpenChange,
  existingApplications,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingApplications: Application[];
  onImport: (drafts: ApplicationDraft[]) => Promise<boolean>;
}) {
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
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
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function loadFile(file: File) {
    setFileError(null);
    let parsed: string[][];
    try {
      parsed = parseCsv(await file.text());
    } catch {
      setFileError("This file could not be read.");
      return;
    }

    if (parsed.length < 2) {
      setFileError(
        "No applications found. The file needs a header row followed by at least one row of data.",
      );
      return;
    }

    const [headerRow, ...dataRows] = parsed;
    const saved = loadSavedSettings(headerRow);
    let nextMapping = guessMapping(headerRow);
    if (saved) {
      nextMapping = Object.fromEntries(
        importFields.map((field) => {
          const header = saved.mapping[field.key];
          const index = header === undefined ? -1 : headerRow.indexOf(header);
          return [field.key, index === -1 ? null : index];
        }),
      ) as ColumnMapping;
    }

    const nextProgressColumns = saved
      ? (saved.progressColumns ?? []).flatMap(({ header, stage }) => {
          const column = headerRow.indexOf(header);
          return column === -1 ? [] : [{ column, stage }];
        })
      : guessProgressColumns(headerRow, nextMapping);

    setFileName(file.name);
    setHeaders(headerRow);
    setRows(dataRows);
    setMapping(nextMapping);
    setProgressColumns(nextProgressColumns);
    setDateOrderChoice(saved?.dateOrder ?? "auto");
    setStageOverrides(saved?.stageOverrides ?? {});
    setOutcomeOverrides(saved?.outcomeOverrides ?? {});
  }

  function resetFile() {
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping(null);
    setFileError(null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void loadFile(file);
  }

  const detectedDateOrder = useMemo(() => {
    if (!mapping) return { order: "mdy" as DateOrder, ambiguous: false };
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
    const columns = [
      ...new Set(
        [mapping.stage, mapping.outcome].filter(
          (column): column is number => column !== null,
        ),
      ),
    ];
    return columns.map((column) => ({
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
    if (!mapping) return null;
    return buildImportPreview(
      headers,
      rows,
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
    headers,
    mapping,
    outcomeValues,
    progressColumns,
    rows,
    skipDuplicates,
    stageValues,
    useFallbackDate,
  ]);

  // Spreadsheets often export dozens of blank placeholder columns
  // ("Column 1", "Column 2", …); only count columns that hold data.
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
          "required" in field &&
          mapping[field.key] === null &&
          !(field.key === "appliedAt" && useFallbackDate),
      )
    : [];
  const readyCount = preview?.rows.length ?? 0;
  const warningCount =
    preview?.rows.filter((row) => row.warnings.length > 0).length ?? 0;
  const canImport = missingRequired.length === 0 && readyCount > 0 && !importing;

  function sampleValue(column: number | null) {
    if (column === null) return "";
    return rows.find((row) => row[column])?.[column] ?? "";
  }

  function updateMapping(field: ImportField, value: string) {
    setMapping((current) =>
      current ? { ...current, [field]: value === "" ? null : Number(value) } : current,
    );
  }

  function updateProgressColumn(index: number, update: Partial<ProgressColumn>) {
    setProgressColumns((current) =>
      current.map((progress, position) =>
        position === index ? { ...progress, ...update } : progress,
      ),
    );
  }

  function addProgressColumn() {
    setProgressColumns((current) => {
      const used = new Set(current.map((progress) => progress.column));
      const column = headers.findIndex((_, index) => !used.has(index));
      const last = current.at(-1)?.stage;
      const stage =
        stages[
          Math.min(
            last ? stages.indexOf(last) + 1 : stages.indexOf("Recruiter screen"),
            stages.length - 1,
          )
        ];
      return column === -1 ? current : [...current, { column, stage }];
    });
  }

  async function handleImport() {
    if (!preview || !mapping || !canImport) return;

    setImporting(true);
    const imported = await onImport(preview.rows.map((row) => row.draft));
    setImporting(false);
    if (!imported) return;

    saveSettings(headers, {
      mapping: Object.fromEntries(
        importFields.flatMap((field) => {
          const column = mapping[field.key];
          return column === null ? [] : [[field.key, headers[column]]];
        }),
      ),
      progressColumns: progressColumns.map(({ column, stage }) => ({
        header: headers[column],
        stage,
      })),
      dateOrder: dateOrderChoice,
      stageOverrides,
      outcomeOverrides,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#0c1722] p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-white/[0.07] px-6 py-5">
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Upload className="size-4" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl tracking-[-0.025em]">
            Import applications
          </DialogTitle>
          <DialogDescription>
            Any CSV with a header row works. You&apos;ll match its columns and
            status values to JobTrack fields before anything is saved.
          </DialogDescription>
        </DialogHeader>

        {!mapping ? (
          <div className="px-6 py-6">
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors ${
                dragging
                  ? "border-primary/60 bg-primary/[0.07]"
                  : "border-white/[0.14] bg-white/[0.02] hover:border-white/[0.24] hover:bg-white/[0.035]"
              }`}
            >
              <FileSpreadsheet
                className="size-8 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="mt-3 text-sm font-medium text-foreground">
                Choose a CSV file or drop it here
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                Comma, semicolon, and tab separated files are supported
              </span>
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void loadFile(file);
                  event.target.value = "";
                }}
              />
            </label>
            {fileError && (
              <p className="mt-3 flex items-start gap-2 text-sm text-[#ffadb2]">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {fileError}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-7 px-6 py-6">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FileSpreadsheet
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="truncate text-foreground">{fileName}</span>
                <span className="shrink-0 text-muted-foreground">
                  · {rows.length} row{rows.length === 1 ? "" : "s"}
                </span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={resetFile}>
                Change file
              </Button>
            </div>

            <section>
              <h3 className="text-sm font-medium text-foreground">Match columns</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                We guessed from the column names. The same column can feed both
                stage and result.
              </p>
              <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                {importFields.map((field) => {
                  const column = mapping[field.key];
                  const sample = sampleValue(column);
                  const required = "required" in field;
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label htmlFor={`import-${field.key}`}>
                        {field.label}
                        {required && <span className="text-[#ff9da4]">*</span>}
                      </Label>
                      <NativeSelect
                        id={`import-${field.key}`}
                        className="w-full"
                        value={column ?? ""}
                        onChange={(event) =>
                          updateMapping(field.key, event.target.value)
                        }
                        aria-invalid={
                          required && column === null && !(field.key === "appliedAt" && useFallbackDate)
                        }
                      >
                        <NativeSelectOption value="">— Not imported —</NativeSelectOption>
                        {headers.map((header, index) => (
                          <NativeSelectOption key={index} value={index}>
                            {header || `Column ${index + 1}`}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      {sample && (
                        <p className="truncate text-xs text-[#71869b]">
                          e.g. {sample}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Progress columns
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    For sheets with one column per round, filled in as you
                    advance. The furthest filled column sets the stage, and the
                    first date found becomes the response date. &ldquo;No&rdquo;
                    or &ldquo;-&rdquo; count as empty; &ldquo;Rejected&rdquo;
                    marks the result.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProgressColumn}
                  className="shrink-0"
                >
                  <Plus aria-hidden="true" />
                  Add
                </Button>
              </div>
              {progressColumns.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.07]">
                  {progressColumns.map((progress, index) => {
                    const filled = rows.filter((row) =>
                      isProgressCellFilled(row[progress.column]?.trim() ?? ""),
                    ).length;
                    return (
                      <div
                        key={index}
                        className="grid items-center gap-2 border-b border-white/[0.06] px-3.5 py-2.5 last:border-b-0 sm:grid-cols-[1fr_auto_auto]"
                      >
                        <div className="min-w-0">
                          <NativeSelect
                            size="sm"
                            className="w-full"
                            aria-label={`Progress column ${index + 1}`}
                            value={progress.column}
                            onChange={(event) =>
                              updateProgressColumn(index, {
                                column: Number(event.target.value),
                              })
                            }
                          >
                            {headers.map((header, column) => (
                              <NativeSelectOption key={column} value={column}>
                                {header || `Column ${column + 1}`}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          <p className="mt-1 text-xs text-[#71869b]">
                            Filled in {filled} of {rows.length} rows
                          </p>
                        </div>
                        <NativeSelect
                          size="sm"
                          className="w-full sm:w-44"
                          aria-label={`Stage reached for ${headers[progress.column]}`}
                          value={progress.stage}
                          onChange={(event) =>
                            updateProgressColumn(index, {
                              stage: event.target.value as Stage,
                            })
                          }
                        >
                          {stages
                            .filter((stage) => stage !== "Applied")
                            .map((stage) => (
                              <NativeSelectOption key={stage} value={stage}>
                                {stage}
                              </NativeSelectOption>
                            ))}
                        </NativeSelect>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${headers[progress.column]}`}
                          onClick={() =>
                            setProgressColumns((current) =>
                              current.filter((_, position) => position !== index),
                            )
                          }
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="import-date-order">Date format</Label>
                <NativeSelect
                  id="import-date-order"
                  className="w-full"
                  value={dateOrderChoice}
                  onChange={(event) =>
                    setDateOrderChoice(event.target.value as DateOrderChoice)
                  }
                >
                  <NativeSelectOption value="auto">
                    Auto-detect ({dateOrderLabels[detectedDateOrder.order]})
                  </NativeSelectOption>
                  <NativeSelectOption value="mdy">MM/DD/YYYY</NativeSelectOption>
                  <NativeSelectOption value="dmy">DD/MM/YYYY</NativeSelectOption>
                </NativeSelect>
                {dateOrderChoice === "auto" && detectedDateOrder.ambiguous && (
                  <p className="flex items-start gap-1.5 text-xs leading-5 text-[#ffd09a]">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    Every date in this file fits both formats. Pick the one your
                    spreadsheet uses.
                  </p>
                )}
                <p className="text-xs text-[#71869b]">
                  ISO dates (2025-09-23) and written dates always work.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={useFallbackDate}
                    onChange={(event) => setUseFallbackDate(event.target.checked)}
                    className="size-4 accent-[#5ee3c2]"
                  />
                  Fallback applied date
                </label>
                <Input
                  type="date"
                  value={fallbackDate}
                  onChange={(event) => setFallbackDate(event.target.value)}
                  disabled={!useFallbackDate}
                  aria-label="Fallback applied date"
                />
                <p className="text-xs leading-5 text-[#71869b]">
                  Used for rows without a readable applied date. Otherwise those
                  rows are skipped.
                </p>
              </div>
            </section>

            {statusColumns.map(({ column, showsStage, showsOutcome, values }) =>
              values.length === 0 ? null : (
                <section key={column}>
                  <h3 className="text-sm font-medium text-foreground">
                    Values in &ldquo;{headers[column] || `Column ${column + 1}`}&rdquo;
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tell JobTrack what each value means. Values we couldn&apos;t
                    recognize are highlighted.
                  </p>
                  <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.07]">
                    <div className="hidden grid-cols-[1fr_auto_auto] gap-2 border-b border-white/[0.07] bg-white/[0.025] px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground sm:grid">
                      <span>Value in file</span>
                      {showsStage && <span className="w-44">Stage reached</span>}
                      {showsOutcome && <span className="w-44">Current result</span>}
                    </div>
                    {values.slice(0, 50).map(({ key, raw }) => {
                      const stageGuess = guessStage(raw);
                      const outcomeGuess = guessOutcome(raw);
                      const needsReview =
                        (showsStage && !stageGuess.recognized && !stageOverrides[key]) ||
                        (showsOutcome && !outcomeGuess.recognized && !outcomeOverrides[key]);
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
                                setStageOverrides((current) => ({
                                  ...current,
                                  [key]: event.target.value as Stage,
                                }))
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
                                setOutcomeOverrides((current) => ({
                                  ...current,
                                  [key]: event.target.value as Outcome,
                                }))
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
                  {values.length > 50 && (
                    <p className="mt-2 text-xs text-[#ffd09a]">
                      This column has {values.length} different values. It may not
                      be a status column; only the first 50 are shown.
                    </p>
                  )}
                </section>
              ),
            )}

            <section className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={appendUnmappedToNotes}
                  onChange={(event) => setAppendUnmappedToNotes(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[#5ee3c2]"
                  disabled={unmappedColumnCount === 0}
                />
                <span>
                  <span className="text-foreground">Keep unmatched columns in notes</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {unmappedColumnCount} column{unmappedColumnCount === 1 ? "" : "s"} not
                    matched
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(event) => setSkipDuplicates(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[#5ee3c2]"
                />
                <span>
                  <span className="text-foreground">Skip duplicates</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Same company, role, and applied date
                  </span>
                </span>
              </label>
            </section>

            {preview && (
              <section className="rounded-xl border border-white/[0.07] bg-[#07131e] px-4 py-4 text-sm">
                {missingRequired.length > 0 ? (
                  <p className="flex items-start gap-2 text-[#ffadb2]">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Match a column for{" "}
                    {missingRequired.map((field) => field.label).join(", ")} to
                    continue.
                  </p>
                ) : (
                  <>
                    <p className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="text-[#8cf0d7]">{readyCount} ready</span>
                      {warningCount > 0 && (
                        <span className="text-[#ffd09a]">
                          {warningCount} with warnings
                        </span>
                      )}
                      {preview.errors.length > 0 && (
                        <span className="text-[#ff9da4]">
                          {preview.errors.length} skipped
                        </span>
                      )}
                      {preview.duplicates.length > 0 && (
                        <span className="text-muted-foreground">
                          {preview.duplicates.length} duplicate
                          {preview.duplicates.length === 1 ? "" : "s"} skipped
                        </span>
                      )}
                    </p>
                    {(preview.errors.length > 0 || warningCount > 0) && (
                      <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                        {preview.errors.map((error) => (
                          <li key={`error-${error.rowNumber}`}>
                            <span className="text-[#ff9da4]">Row {error.rowNumber}:</span>{" "}
                            {error.message}
                          </li>
                        ))}
                        {preview.rows
                          .filter((row) => row.warnings.length > 0)
                          .map((row) => (
                            <li key={`warning-${row.rowNumber}`}>
                              <span className="text-[#ffd09a]">Row {row.rowNumber}:</span>{" "}
                              {row.warnings.join("; ")}
                            </li>
                          ))}
                      </ul>
                    )}
                  </>
                )}
              </section>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-white/[0.07] px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={!canImport}>
            {importing ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            Import {readyCount || ""} application{readyCount === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
