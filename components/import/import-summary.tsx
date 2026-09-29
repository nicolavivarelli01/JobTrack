import { AlertCircle } from "lucide-react";

import type { ImportPreview } from "@/lib/import/types";
import { pluralize } from "@/lib/utils";

function Checkbox({
  label,
  detail,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[#5ee3c2]"
        disabled={disabled}
      />
      <span>
        <span className="text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {detail}
        </span>
      </span>
    </label>
  );
}

export function ImportOptionsSection({
  unmappedColumnCount,
  appendUnmappedToNotes,
  onAppendUnmappedToNotesChange,
  skipDuplicates,
  onSkipDuplicatesChange,
}: {
  unmappedColumnCount: number;
  appendUnmappedToNotes: boolean;
  onAppendUnmappedToNotesChange: (enabled: boolean) => void;
  skipDuplicates: boolean;
  onSkipDuplicatesChange: (enabled: boolean) => void;
}) {
  return (
    <section className="grid gap-2 sm:grid-cols-2">
      <Checkbox
        label="Keep unmatched columns in notes"
        detail={`${pluralize(unmappedColumnCount, "column")} not matched`}
        checked={appendUnmappedToNotes}
        disabled={unmappedColumnCount === 0}
        onChange={onAppendUnmappedToNotesChange}
      />
      <Checkbox
        label="Skip duplicates"
        detail="Same company, role, and applied date"
        checked={skipDuplicates}
        onChange={onSkipDuplicatesChange}
      />
    </section>
  );
}

/** Counts of what will be imported, plus a per-row list of problems. */
export function ImportSummary({
  preview,
  missingFields,
}: {
  preview: ImportPreview;
  missingFields: string[];
}) {
  const rowsWithWarnings = preview.rows.filter(
    (row) => row.warnings.length > 0,
  );

  return (
    <section className="rounded-xl border border-white/[0.07] bg-[#07131e] px-4 py-4 text-sm">
      {missingFields.length > 0 ? (
        <p className="flex items-start gap-2 text-[#ffadb2]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Match a column for {missingFields.join(", ")} to continue.
        </p>
      ) : (
        <>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-[#8cf0d7]">{preview.rows.length} ready</span>
            {rowsWithWarnings.length > 0 && (
              <span className="text-[#ffd09a]">
                {rowsWithWarnings.length} with warnings
              </span>
            )}
            {preview.errors.length > 0 && (
              <span className="text-[#ff9da4]">
                {preview.errors.length} skipped
              </span>
            )}
            {preview.duplicates.length > 0 && (
              <span className="text-muted-foreground">
                {pluralize(preview.duplicates.length, "duplicate")} skipped
              </span>
            )}
          </p>
          {(preview.errors.length > 0 || rowsWithWarnings.length > 0) && (
            <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {preview.errors.map((error) => (
                <li key={`error-${error.rowNumber}`}>
                  <span className="text-[#ff9da4]">Row {error.rowNumber}:</span>{" "}
                  {error.message}
                </li>
              ))}
              {rowsWithWarnings.map((row) => (
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
  );
}
