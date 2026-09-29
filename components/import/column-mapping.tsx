import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { importFields, isRequiredField } from "@/lib/import/fields";
import type { ColumnMapping, ImportField } from "@/lib/import/types";

export function columnName(headers: string[], column: number) {
  return headers[column] || `Column ${column + 1}`;
}

export function ColumnOptions({ headers }: { headers: string[] }) {
  return headers.map((_, column) => (
    <NativeSelectOption key={column} value={column}>
      {columnName(headers, column)}
    </NativeSelectOption>
  ));
}

/** One dropdown per JobTrack field, with an example value from the file. */
export function ColumnMappingSection({
  headers,
  rows,
  mapping,
  fallbackDateEnabled,
  onChange,
}: {
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
  fallbackDateEnabled: boolean;
  onChange: (field: ImportField, column: number | null) => void;
}) {
  function sampleValue(column: number | null) {
    if (column === null) return "";
    return rows.find((row) => row[column])?.[column] ?? "";
  }

  return (
    <section>
      <h3 className="text-sm font-medium text-foreground">Match columns</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        We guessed from the column names. The same column can feed both stage
        and result.
      </p>
      <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
        {importFields.map((field) => {
          const column = mapping[field.key];
          const sample = sampleValue(column);
          const required = isRequiredField(field);
          const missing =
            required &&
            column === null &&
            !(field.key === "appliedAt" && fallbackDateEnabled);

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
                  onChange(
                    field.key,
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
                aria-invalid={missing}
              >
                <NativeSelectOption value="">
                  — Not imported —
                </NativeSelectOption>
                <ColumnOptions headers={headers} />
              </NativeSelect>
              {sample && (
                <p className="truncate text-xs text-[#71869b]">e.g. {sample}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
