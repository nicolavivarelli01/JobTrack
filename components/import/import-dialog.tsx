"use client";

import { useState } from "react";
import { Check, Loader2, Upload } from "lucide-react";

import { ColumnMappingSection } from "@/components/import/column-mapping";
import { DateOptionsSection } from "@/components/import/date-options";
import { FileDropZone, SelectedFile } from "@/components/import/file-drop-zone";
import {
  ImportOptionsSection,
  ImportSummary,
} from "@/components/import/import-summary";
import { ProgressColumnsSection } from "@/components/import/progress-columns";
import { StatusValuesSection } from "@/components/import/status-values";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useImportWizard } from "@/hooks/use-import-wizard";
import type { Application, ApplicationDraft } from "@/lib/applications";

export function ImportDialog({
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
  const wizard = useImportWizard(existingApplications);
  const [importing, setImporting] = useState(false);
  const { sheet, mapping, preview } = wizard;

  const readyCount = preview?.rows.length ?? 0;
  const canImport =
    wizard.missingRequired.length === 0 && readyCount > 0 && !importing;

  async function handleImport() {
    if (!preview || !canImport) return;

    setImporting(true);
    const imported = await onImport(preview.rows.map((row) => row.draft));
    setImporting(false);
    if (!imported) return;

    wizard.rememberSettings();
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
            Any CSV or Excel (.xlsx) file with a header row works. You&apos;ll
            match its columns and status values to JobTrack fields before
            anything is saved.
          </DialogDescription>
        </DialogHeader>

        {!sheet || !mapping ? (
          <FileDropZone
            reading={wizard.file.reading}
            error={wizard.file.error}
            onFile={(file) => void wizard.file.load(file)}
          />
        ) : (
          <div className="space-y-7 px-6 py-6">
            <SelectedFile
              name={wizard.file.name}
              rowCount={sheet.rows.length}
              onChange={wizard.file.reset}
            />

            <ColumnMappingSection
              headers={sheet.headers}
              rows={sheet.rows}
              mapping={mapping}
              fallbackDateEnabled={wizard.useFallbackDate}
              onChange={wizard.setColumn}
            />

            <ProgressColumnsSection
              sheet={sheet}
              progressColumns={wizard.progressColumns}
              redCellCounts={wizard.redCellCounts}
              onAdd={wizard.addProgressColumn}
              onUpdate={wizard.updateProgressColumn}
              onRemove={wizard.removeProgressColumn}
            />

            <DateOptionsSection
              dateOrderChoice={wizard.dateOrderChoice}
              detected={wizard.detectedDateOrder}
              onDateOrderChange={wizard.setDateOrderChoice}
              useFallbackDate={wizard.useFallbackDate}
              onUseFallbackDateChange={wizard.setUseFallbackDate}
              fallbackDate={wizard.fallbackDate}
              onFallbackDateChange={wizard.setFallbackDate}
            />

            {wizard.statusColumns.map((status) => (
              <StatusValuesSection
                key={status.column}
                headers={sheet.headers}
                {...status}
                stageValues={wizard.stageValues}
                outcomeValues={wizard.outcomeValues}
                stageOverrides={wizard.stageOverrides}
                outcomeOverrides={wizard.outcomeOverrides}
                onStageChange={wizard.setStageValue}
                onOutcomeChange={wizard.setOutcomeValue}
              />
            ))}

            <ImportOptionsSection
              unmappedColumnCount={wizard.unmappedColumnCount}
              appendUnmappedToNotes={wizard.appendUnmappedToNotes}
              onAppendUnmappedToNotesChange={wizard.setAppendUnmappedToNotes}
              skipDuplicates={wizard.skipDuplicates}
              onSkipDuplicatesChange={wizard.setSkipDuplicates}
            />

            {preview && (
              <ImportSummary
                preview={preview}
                missingFields={wizard.missingRequired.map(
                  (field) => field.label,
                )}
              />
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
