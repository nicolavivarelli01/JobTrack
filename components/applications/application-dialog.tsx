"use client";

import { FormEvent, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { InterviewScheduleFields } from "@/components/applications/interview-schedule-fields";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  changeAssessment,
  changeOutcome,
  changeStage,
  draftFromApplication,
  newDraft,
  prepareDraftForSave,
} from "@/lib/application-form";
import {
  outcomes,
  stages,
  type Application,
  type ApplicationDraft,
  type Outcome,
  type Stage,
} from "@/lib/applications";
import { todayInputValue } from "@/lib/dates";

export function ApplicationDialog({
  open,
  onOpenChange,
  application,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onSave: (draft: ApplicationDraft, id?: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<ApplicationDraft>(() =>
    application
      ? draftFromApplication(application)
      : newDraft(todayInputValue()),
  );
  const [submitting, setSubmitting] = useState(false);
  const [showInterviewFields, setShowInterviewFields] = useState(
    Boolean(
      application?.interviewAt ||
      application?.interviewLink ||
      application?.interviewDetails,
    ),
  );

  function updateField<K extends keyof ApplicationDraft>(
    key: K,
    value: ApplicationDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleStageChange(stage: Stage) {
    setDraft((current) => changeStage(current, stage, todayInputValue()));
  }

  function handleAssessmentChange(hadAssessment: boolean) {
    setDraft((current) =>
      changeAssessment(current, hadAssessment, todayInputValue()),
    );
  }

  function handleOutcomeChange(outcome: Outcome) {
    setDraft((current) => changeOutcome(current, outcome, todayInputValue()));
  }

  function removeInterviewSchedule() {
    setShowInterviewFields(false);
    setDraft((current) => ({
      ...current,
      interviewAt: undefined,
      interviewLink: undefined,
      interviewDetails: undefined,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.company.trim() || !draft.role.trim() || !draft.appliedAt) return;

    setSubmitting(true);
    const saved = await onSave(
      prepareDraftForSave(draft, {
        includeInterview: showInterviewFields,
        today: todayInputValue(),
      }),
      application?.id,
    );
    setSubmitting(false);
    if (saved) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#0c1722] p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-white/[0.07] px-6 py-5">
          <DialogTitle className="text-xl tracking-[-0.025em]">
            {application ? "Edit application" : "New application"}
          </DialogTitle>
          <DialogDescription>
            Stage tracks how far you got; result tracks where it stands now.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={draft.company}
                onChange={(event) => updateField("company", event.target.value)}
                placeholder="Company name"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={draft.role}
                onChange={(event) => updateField("role", event.target.value)}
                placeholder="Machine Learning Engineer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Highest stage reached</Label>
              <NativeSelect
                id="stage"
                className="w-full"
                value={draft.stage}
                onChange={(event) =>
                  handleStageChange(event.target.value as Stage)
                }
              >
                {stages.map((stage) => (
                  <NativeSelectOption key={stage} value={stage}>
                    {stage}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outcome">Current result</Label>
              <NativeSelect
                id="outcome"
                className="w-full"
                value={draft.outcome}
                onChange={(event) =>
                  handleOutcomeChange(event.target.value as Outcome)
                }
              >
                {outcomes.map((outcome) => (
                  <NativeSelectOption key={outcome} value={outcome}>
                    {outcome}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="company-status">
                Company status{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="company-status"
                value={draft.companyStatus ?? ""}
                onChange={(event) =>
                  updateField("companyStatus", event.target.value)
                }
                placeholder="Submitted, Resume Screening, Under Review…"
                maxLength={200}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Use the company&apos;s exact wording. This is free text, so you
                can enter any label shown in its portal or emails.
              </p>
            </div>
            <div className="flex items-center justify-between gap-5 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 sm:col-span-2">
              <div className="min-w-0">
                <Label htmlFor="had-assessment">
                  Assessment in this process
                </Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Turn this on for an online assessment, take-home, or technical
                  test—even if you later reached an interview.
                </p>
              </div>
              <Switch
                id="had-assessment"
                checked={draft.hadAssessment}
                onCheckedChange={handleAssessmentChange}
                aria-label="This application process included an assessment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applied-date">Applied date</Label>
              <Input
                id="applied-date"
                type="date"
                value={draft.appliedAt}
                onChange={(event) =>
                  updateField("appliedAt", event.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response-date">
                First positive response date
              </Label>
              <Input
                id="response-date"
                type="date"
                value={draft.responseAt ?? ""}
                onChange={(event) =>
                  updateField("responseAt", event.target.value)
                }
              />
            </div>
            {draft.outcome === "Rejected" && (
              <div className="space-y-2">
                <Label htmlFor="rejection-date">Rejection date</Label>
                <Input
                  id="rejection-date"
                  type="date"
                  value={draft.rejectedAt ?? ""}
                  onChange={(event) =>
                    updateField("rejectedAt", event.target.value)
                  }
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={draft.source ?? ""}
                onChange={(event) => updateField("source", event.target.value)}
                placeholder="LinkedIn, referral, company site…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={draft.location ?? ""}
                onChange={(event) =>
                  updateField("location", event.target.value)
                }
                placeholder="Chicago, IL or Remote"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="job-url">Job link</Label>
              <Input
                id="job-url"
                type="url"
                value={draft.jobUrl ?? ""}
                onChange={(event) => updateField("jobUrl", event.target.value)}
                placeholder="https://…"
              />
            </div>
            <InterviewScheduleFields
              visible={showInterviewFields}
              values={draft}
              onAdd={() => setShowInterviewFields(true)}
              onRemove={removeInterviewSchedule}
              onChange={updateField}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={draft.notes ?? ""}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Recruiter name, next steps, salary range, or anything worth remembering…"
                className="min-h-28 resize-y"
                maxLength={5000}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-white/[0.07] px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Check aria-hidden="true" />
              )}
              {application ? "Save changes" : "Add application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
