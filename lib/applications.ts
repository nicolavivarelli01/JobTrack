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
