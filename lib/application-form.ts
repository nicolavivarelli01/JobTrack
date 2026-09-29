import {
  hasPositiveResponse,
  type Application,
  type ApplicationDraft,
  type Outcome,
  type Stage,
} from "@/lib/applications";

// Rules that keep stage, result, assessment, and dates consistent while the
// user edits an application. Each takes today's date so they stay pure.

export function newDraft(today: string): ApplicationDraft {
  return {
    company: "",
    role: "",
    stage: "Applied",
    outcome: "Active",
    companyStatus: "",
    appliedAt: today,
    responseAt: "",
    source: "",
    location: "",
    jobUrl: "",
    notes: "",
    interviewAt: "",
    interviewLink: "",
    interviewDetails: "",
    rejectedAt: "",
    hadAssessment: false,
  };
}

export function draftFromApplication(
  application: Application,
): ApplicationDraft {
  return {
    company: application.company,
    role: application.role,
    stage: application.stage,
    outcome: application.outcome,
    companyStatus: application.companyStatus,
    appliedAt: application.appliedAt,
    responseAt: application.responseAt,
    source: application.source,
    location: application.location,
    jobUrl: application.jobUrl,
    notes: application.notes,
    interviewAt: application.interviewAt,
    interviewLink: application.interviewLink,
    interviewDetails: application.interviewDetails,
    rejectedAt: application.rejectedAt,
    hadAssessment: application.hadAssessment,
  };
}

/**
 * Reaching Offer sets the result to Offer; reaching Assessment turns the
 * assessment on; going back to Applied turns it off. Moving past Applied
 * records today as the response date if none is set.
 */
export function changeStage(
  draft: ApplicationDraft,
  stage: Stage,
  today: string,
): ApplicationDraft {
  return {
    ...draft,
    stage,
    outcome: stage === "Offer" ? "Offer" : draft.outcome,
    hadAssessment:
      stage === "Assessment"
        ? true
        : stage === "Applied"
          ? false
          : draft.hadAssessment,
    responseAt:
      stage !== "Applied" && !draft.responseAt ? today : draft.responseAt,
  };
}

/** Toggling the assessment moves between Applied and Assessment. */
export function changeAssessment(
  draft: ApplicationDraft,
  hadAssessment: boolean,
  today: string,
): ApplicationDraft {
  const leavingAssessment = !hadAssessment && draft.stage === "Assessment";
  return {
    ...draft,
    hadAssessment,
    stage:
      hadAssessment && draft.stage === "Applied"
        ? "Assessment"
        : leavingAssessment
          ? "Applied"
          : draft.stage,
    responseAt:
      hadAssessment && !draft.responseAt
        ? today
        : leavingAssessment
          ? undefined
          : draft.responseAt,
  };
}

/** An Offer result also sets the stage; Rejected needs a rejection date. */
export function changeOutcome(
  draft: ApplicationDraft,
  outcome: Outcome,
  today: string,
): ApplicationDraft {
  return {
    ...draft,
    outcome,
    stage: outcome === "Offer" ? "Offer" : draft.stage,
    rejectedAt: outcome === "Rejected" ? draft.rejectedAt || today : undefined,
    responseAt:
      (draft.stage !== "Applied" || outcome === "Offer") && !draft.responseAt
        ? today
        : draft.responseAt,
  };
}

/**
 * Trims text, drops the interview fields when the schedule was removed, and
 * fills or clears the response and rejection dates to match the stage and
 * result.
 */
export function prepareDraftForSave(
  draft: ApplicationDraft,
  { includeInterview, today }: { includeInterview: boolean; today: string },
): ApplicationDraft {
  return {
    ...draft,
    company: draft.company.trim(),
    role: draft.role.trim(),
    companyStatus: draft.companyStatus?.trim(),
    source: draft.source?.trim(),
    location: draft.location?.trim(),
    jobUrl: draft.jobUrl?.trim(),
    notes: draft.notes?.trim(),
    interviewAt: includeInterview ? draft.interviewAt : undefined,
    interviewLink: includeInterview ? draft.interviewLink?.trim() : undefined,
    interviewDetails: includeInterview
      ? draft.interviewDetails?.trim()
      : undefined,
    responseAt: hasPositiveResponse(draft)
      ? draft.responseAt || today
      : undefined,
    rejectedAt:
      draft.outcome === "Rejected" ? draft.rejectedAt || today : undefined,
  };
}
