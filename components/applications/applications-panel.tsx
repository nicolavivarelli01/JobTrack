"use client";

import { useMemo, useState } from "react";
import { Download, Search, Upload } from "lucide-react";

import { ApplicationCards } from "@/components/applications/application-cards";
import { ApplicationTable } from "@/components/applications/application-table";
import { EmptyApplications } from "@/components/applications/empty-applications";
import { ExportCsvDialog } from "@/components/applications/export-csv-dialog";
import { ImportDialog } from "@/components/import/import-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  stages,
  type Application,
  type ApplicationDraft,
} from "@/lib/applications";
import { filterApplications } from "@/lib/metrics";

/** The applications card: search, status filter, import/export, and the list. */
export function ApplicationsPanel({
  applications,
  onAdd,
  onEdit,
  onTogglePin,
  onDelete,
  onImport,
}: {
  applications: Application[];
  onAdd: () => void;
  onEdit: (application: Application) => void;
  onTogglePin: (application: Application) => void;
  onDelete: (application: Application) => void;
  onImport: (drafts: ApplicationDraft[]) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const filteredApplications = useMemo(
    () => filterApplications(applications, search, statusFilter),
    [applications, search, statusFilter],
  );
  const listHandlers = { onEdit, onTogglePin, onDelete };

  return (
    <>
      <Card className="mt-4 gap-0 overflow-hidden border-white/[0.07] bg-card/85 py-0">
        <CardHeader className="gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto]">
          <div>
            <CardTitle className="text-base tracking-[-0.02em]">
              Applications
            </CardTitle>
            <CardDescription className="mt-1.5">
              {filteredApplications.length} of {applications.length} shown
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload aria-hidden="true" />
              Import
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExportDialogOpen(true)}
              disabled={filteredApplications.length === 0}
            >
              <Download aria-hidden="true" />
              Export CSV
            </Button>
            <div className="relative min-w-0 sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search company or role"
                aria-label="Search applications"
              />
            </div>
            <NativeSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full sm:w-44"
              aria-label="Filter by status"
            >
              <NativeSelectOption value="All">All statuses</NativeSelectOption>
              <NativeSelectOption value="Active">Active</NativeSelectOption>
              {stages.map((stage) => (
                <NativeSelectOption key={stage} value={stage}>
                  {stage}
                </NativeSelectOption>
              ))}
              <NativeSelectOption value="Rejected">Rejected</NativeSelectOption>
              <NativeSelectOption value="Withdrawn">
                Withdrawn
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </CardHeader>

        {applications.length === 0 ? (
          <EmptyApplications onAdd={onAdd} />
        ) : filteredApplications.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
            <Search
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-3 font-semibold">No matching applications</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search or status.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/[0.055] md:hidden">
              <ApplicationCards
                applications={filteredApplications}
                {...listHandlers}
              />
            </div>

            <div className="hidden overflow-x-auto md:block">
              <ApplicationTable
                applications={filteredApplications}
                {...listHandlers}
              />
            </div>
          </>
        )}
      </Card>

      <ExportCsvDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        applications={filteredApplications}
      />
      <ImportDialog
        key={`import-${importDialogOpen}`}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        existingApplications={applications}
        onImport={onImport}
      />
    </>
  );
}
