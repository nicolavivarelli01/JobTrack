export const stages = [
  "Applied",
  "Assessment",
  "Recruiter screen",
  "Interview 1",
  "Interview 2",
  "Interview 3",
  "Interview 4+",
  "Offer",
] as const;

export const outcomes = ["Active", "Rejected", "Offer", "Withdrawn"] as const;

export type Stage = (typeof stages)[number];
export type Outcome = (typeof outcomes)[number];

/** Position of each stage in the pipeline, for "how far did it get" checks. */
export const stageRank = Object.fromEntries(
  stages.map((stage, index) => [stage, index]),
) as Record<Stage, number>;

export type Application = {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  outcome: Outcome;
  companyStatus?: string;
  appliedAt: string;
  responseAt?: string;
  source?: string;
  location?: string;
  jobUrl?: string;
  notes?: string;
  interviewAt?: string;
  interviewLink?: string;
  interviewDetails?: string;
  rejectedAt?: string;
  hadAssessment: boolean;
  pinned: boolean;
};

export type ApplicationDraft = Omit<Application, "id" | "pinned">;

/** Anything past "Applied" counts as a positive response from the company. */
export function hasPositiveResponse(
  application: Pick<ApplicationDraft, "stage" | "outcome" | "hadAssessment">,
) {
  return (
    application.hadAssessment ||
    application.stage !== "Applied" ||
    application.outcome === "Offer"
  );
}

export type ApplicationRow = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  stage: Stage;
  outcome: Outcome;
  company_status: string | null;
  applied_at: string;
  response_at: string | null;
  source: string | null;
  location: string | null;
  job_url: string | null;
  notes: string | null;
  interview_at: string | null;
  interview_link: string | null;
  interview_details: string | null;
  rejected_at: string | null;
  had_assessment: boolean;
  pinned: boolean;
  legacy_id: string | null;
};

export const applicationColumns =
  "id,user_id,company,role,stage,outcome,company_status,applied_at,response_at,source,location,job_url,notes,interview_at,interview_link,interview_details,rejected_at,had_assessment,pinned,legacy_id";

export function applicationFromRow(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    stage: row.stage,
    outcome: row.outcome,
    companyStatus: row.company_status ?? undefined,
    appliedAt: row.applied_at,
    responseAt: row.response_at ?? undefined,
    source: row.source ?? undefined,
    location: row.location ?? undefined,
    jobUrl: row.job_url ?? undefined,
    notes: row.notes ?? undefined,
    interviewAt: row.interview_at ?? undefined,
    interviewLink: row.interview_link ?? undefined,
    interviewDetails: row.interview_details ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    hadAssessment: row.had_assessment || row.stage === "Assessment",
    pinned: row.pinned,
  };
}

/** Columns written on insert and update. Empty strings are stored as null. */
export function toApplicationRow(draft: ApplicationDraft) {
  return {
    company: draft.company,
    role: draft.role,
    stage: draft.stage,
    outcome: draft.outcome,
    company_status: draft.companyStatus || null,
    applied_at: draft.appliedAt,
    response_at: draft.responseAt || null,
    source: draft.source || null,
    location: draft.location || null,
    job_url: draft.jobUrl || null,
    notes: draft.notes || null,
    interview_at: draft.interviewAt || null,
    interview_link: draft.interviewLink || null,
    interview_details: draft.interviewDetails || null,
    rejected_at: draft.rejectedAt || null,
    had_assessment: draft.hadAssessment || draft.stage === "Assessment",
  };
}
