"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Application } from "@/lib/applications";
import {
  csvColumns,
  downloadApplicationsCsv,
  type CsvColumnKey,
} from "@/lib/csv-export";
import { pluralize } from "@/lib/utils";

export function ExportCsvDialog({
  open,
  onOpenChange,
  applications,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: Application[];
}) {
  const [selectedColumns, setSelectedColumns] = useState<Set<CsvColumnKey>>(
    () => new Set(csvColumns.map((column) => column.key)),
  );

  const allSelected = selectedColumns.size === csvColumns.length;
  const canExport = applications.length > 0 && selectedColumns.size > 0;

  function toggleColumn(key: CsvColumnKey) {
    setSelectedColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllColumns() {
    setSelectedColumns(new Set(csvColumns.map((column) => column.key)));
  }

  function exportCsv() {
    if (!canExport) return;

    downloadApplicationsCsv(applications, selectedColumns);
    toast.success(`${pluralize(applications.length, "application")} exported`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#0c1722] p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-white/[0.07] px-6 py-5">
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Download className="size-4" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl tracking-[-0.025em]">
            Export applications
          </DialogTitle>
          <DialogDescription>
            Choose the columns to include. This exports the{" "}
            {pluralize(applications.length, "application")} currently shown by
            your search and status filters.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">CSV columns</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedColumns.size} of {csvColumns.length} selected
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAllColumns}
                disabled={allSelected}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedColumns(new Set())}
                disabled={selectedColumns.size === 0}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {csvColumns.map((column) => (
              <label
                key={column.key}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm transition-colors hover:border-white/[0.13] hover:bg-white/[0.04]"
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.has(column.key)}
                  onChange={() => toggleColumn(column.key)}
                  className="size-4 shrink-0 accent-[#5ee3c2]"
                />
                <span className="text-foreground">{column.label}</span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t border-white/[0.07] px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={exportCsv} disabled={!canExport}>
            <Download aria-hidden="true" />
            Export {applications.length || ""} application
            {applications.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
