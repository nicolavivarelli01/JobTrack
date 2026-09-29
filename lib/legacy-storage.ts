import {
  outcomes,
  stages,
  type Application,
  type Outcome,
  type Stage,
} from "@/lib/applications";

// Before Supabase, applications lived in localStorage under this key. They are
// copied to the account once, on first sign-in.
const storageKey = "jobtrack.applications.v1";

type StoredStage = Stage | "Interview";

type StoredApplication = Omit<
  Application,
  "stage" | "hadAssessment" | "pinned"
> & {
  stage: StoredStage;
  hadAssessment?: boolean;
};

function isStoredApplication(value: unknown): value is StoredApplication {
  if (!value || typeof value !== "object") return false;

  const application = value as Partial<StoredApplication>;
  return (
    typeof application.id === "string" &&
    typeof application.company === "string" &&
    typeof application.role === "string" &&
    typeof application.appliedAt === "string" &&
    [...stages, "Interview"].includes(application.stage as StoredStage) &&
    outcomes.includes(application.outcome as Outcome)
  );
}

function normalizeStoredApplication(
  application: StoredApplication,
): Application {
  return {
    ...application,
    stage:
      application.stage === "Interview" ? "Interview 1" : application.stage,
    hadAssessment:
      application.hadAssessment || application.stage === "Assessment",
    rejectedAt:
      application.outcome === "Rejected"
        ? application.rejectedAt ||
          application.responseAt ||
          application.appliedAt
        : application.rejectedAt,
    pinned: false,
  };
}

/** Saved local applications, excluding the old built-in demo rows. */
export function readLegacyApplications(): Application[] {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return [];

  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isStoredApplication)
      .map(normalizeStoredApplication)
      .filter((application) => !application.id.startsWith("demo-"));
  } catch {
    return [];
  }
}
