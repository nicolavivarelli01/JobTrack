import { CalendarClock, CircleDot, ExternalLink, Link2 } from "lucide-react";

import { ApplicationActions } from "@/components/applications/application-actions";
import type { ApplicationListProps } from "@/components/applications/application-table";
import { PinnedIndicator } from "@/components/applications/pinned-indicator";
import {
  OutcomeBadge,
  StageBadge,
} from "@/components/applications/status-badge";
import { CompanyAvatar } from "@/components/company-avatar";
import { formatDate, formatDateTime } from "@/lib/dates";

/** Card list for phones; the table takes over from the md breakpoint. */
export function ApplicationCards({
  applications,
  onEdit,
  onTogglePin,
  onDelete,
}: ApplicationListProps) {
  return (
    <>
      {applications.map((application) => (
        <article
          key={application.id}
          className="px-4 py-5 transition-colors active:bg-white/[0.025]"
        >
          <div className="flex items-start gap-3">
            <CompanyAvatar
              key={`mobile-${application.id}-${application.jobUrl ?? ""}`}
              company={application.company}
              jobUrl={application.jobUrl}
              className="size-10"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {application.pinned && <PinnedIndicator />}
                    <h3 className="truncate font-medium text-foreground">
                      {application.company}
                    </h3>
                    {application.jobUrl && (
                      <a
                        href={application.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                        aria-label={`Open ${application.company} job posting`}
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {application.role}
                  </p>
                </div>
                <ApplicationActions
                  application={application}
                  onEdit={onEdit}
                  onTogglePin={onTogglePin}
                  onDelete={onDelete}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <StageBadge stage={application.stage} />
                <OutcomeBadge outcome={application.outcome} />
              </div>

              {application.companyStatus && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#7aa7ff]/20 bg-[#7aa7ff]/[0.055] px-3 py-2.5">
                  <CircleDot
                    className="mt-0.5 size-3.5 shrink-0 text-[#7aa7ff]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#71869b]">
                      Company status
                    </p>
                    <p className="mt-0.5 break-words text-sm text-[#b8caff]">
                      {application.companyStatus}
                    </p>
                  </div>
                </div>
              )}

              {application.interviewAt && (
                <div className="mt-4 rounded-lg border border-[#ffb562]/20 bg-[#ffb562]/[0.055] px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex min-w-0 items-start gap-2 text-sm font-medium text-[#ffd09a]">
                      <CalendarClock
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{formatDateTime(application.interviewAt)}</span>
                    </p>
                    {application.interviewLink && (
                      <a
                        href={application.interviewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        <Link2 className="size-3.5" aria-hidden="true" />
                        Join
                      </a>
                    )}
                  </div>
                  {application.interviewDetails && (
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                      {application.interviewDetails}
                    </p>
                  )}
                </div>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Applied</dt>
                  <dd className="mt-1 font-mono text-[#b5c4d0]">
                    {formatDate(application.appliedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Response</dt>
                  <dd className="mt-1 font-mono text-[#b5c4d0]">
                    {formatDate(application.responseAt)}
                  </dd>
                </div>
                {(application.location || application.source) && (
                  <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    {application.location && (
                      <span>{application.location}</span>
                    )}
                    {application.source && (
                      <span>Via {application.source}</span>
                    )}
                  </div>
                )}
              </dl>

              {application.notes && (
                <p className="mt-4 line-clamp-3 rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2.5 text-sm leading-5 text-[#8fa3b6]">
                  {application.notes}
                </p>
              )}
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
