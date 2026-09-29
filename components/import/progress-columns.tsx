import { Plus, X } from "lucide-react";

import { ColumnOptions } from "@/components/import/column-mapping";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { stages, type Stage } from "@/lib/applications";
import { isProgressCellFilled } from "@/lib/import/progress";
import {
  cellKey,
  type ProgressColumn,
  type SheetData,
} from "@/lib/import/types";
import { pluralize } from "@/lib/utils";

export function ProgressColumnsSection({
  sheet,
  progressColumns,
  redCellCounts,
  onAdd,
  onUpdate,
  onRemove,
}: {
  sheet: SheetData;
  progressColumns: ProgressColumn[];
  redCellCounts: { used: number; ignored: number };
  onAdd: () => void;
  onUpdate: (index: number, update: Partial<ProgressColumn>) => void;
  onRemove: (index: number) => void;
}) {
  const { headers, rows } = sheet;

  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Progress columns
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            For sheets with one column per round, filled in as you advance. The
            furthest filled column sets the stage, and the first date found
            becomes the response date. &ldquo;No&rdquo; or &ldquo;-&rdquo; count
            as empty; &ldquo;Rejected&rdquo; or a red cell (Excel files) marks a
            rejection.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
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
            const red = rows.filter((_, row) =>
              sheet.redCells.has(cellKey(row, progress.column)),
            ).length;
            const name = headers[progress.column];

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
                      onUpdate(index, { column: Number(event.target.value) })
                    }
                  >
                    <ColumnOptions headers={headers} />
                  </NativeSelect>
                  <p className="mt-1 text-xs text-[#71869b]">
                    Filled in {filled} of {rows.length} rows
                    {red > 0 && (
                      <span className="text-[#ff9da4]"> · {red} red</span>
                    )}
                  </p>
                </div>
                <NativeSelect
                  size="sm"
                  className="w-full sm:w-44"
                  aria-label={`Stage reached for ${name}`}
                  value={progress.stage}
                  onChange={(event) =>
                    onUpdate(index, { stage: event.target.value as Stage })
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
                  aria-label={`Remove ${name}`}
                  onClick={() => onRemove(index)}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {(redCellCounts.used > 0 || redCellCounts.ignored > 0) && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-[#ff6b74]/20 bg-[#ff6b74]/[0.06] px-3.5 py-2.5 text-xs leading-5 text-[#ffb3b8]">
          <span
            className="mt-1 size-2.5 shrink-0 rounded-sm bg-[#ff4d57]"
            aria-hidden="true"
          />
          <span>
            {pluralize(redCellCounts.used, "red cell")} in progress columns will
            be imported as rejections, dated to the applied date unless the cell
            holds a date.
            {redCellCounts.ignored > 0 &&
              ` ${pluralize(redCellCounts.ignored, "red cell")} in other columns ${redCellCounts.ignored === 1 ? "is" : "are"} ignored.`}
          </span>
        </p>
      )}
    </section>
  );
}
