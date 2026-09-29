"use client";

import { DragEvent, useState } from "react";
import { AlertCircle, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/utils";

const acceptedTypes =
  ".csv,.tsv,.txt,.xlsx,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function FileDropZone({
  reading,
  error,
  onFile,
}: {
  reading: boolean;
  error: string | null;
  onFile: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
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
          {reading
            ? "Reading file…"
            : "Choose a CSV or Excel file, or drop it here"}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          Excel files keep hyperlinks, and red cells in progress columns count
          as rejections
        </span>
        <input
          type="file"
          accept={acceptedTypes}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
      </label>
      {error && (
        <p className="mt-3 flex items-start gap-2 text-sm text-[#ffadb2]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectedFile({
  name,
  rowCount,
  onChange,
}: {
  name: string;
  rowCount: number;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <FileSpreadsheet
          className="size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span className="truncate text-foreground">{name}</span>
        <span className="shrink-0 text-muted-foreground">
          · {pluralize(rowCount, "row")}
        </span>
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onChange}>
        Change file
      </Button>
    </div>
  );
}
