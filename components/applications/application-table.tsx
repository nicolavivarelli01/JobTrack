import { CalendarClock, CircleDot, ExternalLink, Link2 } from "lucide-react";

import { ApplicationActions } from "@/components/applications/application-actions";
import { PinnedIndicator } from "@/components/applications/pinned-indicator";
import {
  OutcomeBadge,
  StageBadge,
} from "@/components/applications/status-badge";
import { CompanyAvatar } from "@/components/company-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Application } from "@/lib/applications";
import { formatDate, formatDateTime } from "@/lib/dates";

export type ApplicationListProps = {
  applications: Application[];
  onEdit: (application: Application) => void;
  onTogglePin: (application: Application) => void;
  onDelete: (application: Application) => void;
};

export function ApplicationTable({
  applications,
  onEdit,
  onTogglePin,
  onDelete,
}: ApplicationListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/[0.07] hover:bg-transparent">
          <TableHead className="h-11 min-w-72 px-5 text-xs uppercase tracking-[0.1em] text-muted-foreground sm:px-6">
            Company & role
          </TableHead>
          <TableHead className="h-11 min-w-40 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Stage
          </TableHead>
          <TableHead className="h-11 min-w-28 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Result
          </TableHead>
          <TableHead className="h-11 min-w-32 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Applied
          </TableHead>
          <TableHead className="h-11 min-w-32 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Response
          </TableHead>
          <TableHead className="h-11 min-w-32 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Source
          </TableHead>
          <TableHead className="h-11 w-14 px-5 text-right text-xs uppercase tracking-[0.1em] text-muted-foreground sm:px-6">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((application) => (
          <TableRow
            key={application.id}
            className="border-white/[0.055] hover:bg-white/[0.025]"
          >
            <TableCell className="px-5 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                <CompanyAvatar
                  key={`desktop-${application.id}-${application.jobUrl ?? ""}`}
                  company={application.company}
                  jobUrl={application.jobUrl}
                  className="mt-0.5 size-9 rounded-lg"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {application.pinned && <PinnedIndicator />}
                    <p className="truncate font-medium text-foreground">
                      {application.company}
                    </p>
                    {application.jobUrl && (
                      <a
                        href={application.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground transition-colors hover:text-primary"
                        aria-label={`Open ${application.company} job posting`}
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {application.role}
                    {application.location ? ` · ${application.location}` : ""}
                  </p>
                  {application.companyStatus && (
                    <div
                      className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-[#7aa7ff]/20 bg-[#7aa7ff]/[0.055] px-2 py-1 text-xs text-[#b8caff]"
                      title={`Company status: ${application.companyStatus}`}
                    >
                      <CircleDot
                        className="size-3 shrink-0 text-[#7aa7ff]"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        Company status: {application.companyStatus}
                      </span>
                    </div>
                  )}
                  {application.interviewAt && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#d9ad76]">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock
                          className="size-3.5"
                          aria-hidden="true"
                        />
                        {formatDateTime(application.interviewAt)}
                      </span>
                      {application.interviewLink && (
                        <a
                          href={application.interviewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <Link2 className="size-3" aria-hidden="true" />
                          Join
                        </a>
                      )}
                    </div>
                  )}
                  {application.notes && (
                    <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-5 text-[#7f93a6]">
                      {application.notes}
                    </p>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <StageBadge stage={application.stage} />
            </TableCell>
            <TableCell>
              <OutcomeBadge outcome={application.outcome} />
            </TableCell>
            <TableCell className="font-mono text-xs text-[#9aabba]">
              {formatDate(application.appliedAt)}
            </TableCell>
            <TableCell className="font-mono text-xs text-[#9aabba]">
              {formatDate(application.responseAt)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {application.source || "—"}
            </TableCell>
            <TableCell className="px-5 text-right sm:px-6">
              <ApplicationActions
                application={application}
                onEdit={onEdit}
                onTogglePin={onTogglePin}
                onDelete={onDelete}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
