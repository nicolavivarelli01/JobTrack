import {
  hasPositiveResponse,
  stageRank,
  type Application,
} from "@/lib/applications";
import {
  addDays,
  parseLocalDate,
  startOfLocalDay,
  subtractMonths,
} from "@/lib/dates";

export const momentumRanges = [
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "3mo", label: "3mo" },
  { value: "6mo", label: "6mo" },
] as const;

export type MomentumRange = (typeof momentumRanges)[number]["value"];

export type ApplicationMetrics = ReturnType<typeof computeMetrics>;

function percentOf(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function computeMetrics(applications: Application[]) {
  const count = (predicate: (application: Application) => boolean) =>
    applications.filter(predicate).length;

  const total = applications.length;
  const positiveResponses = count(hasPositiveResponse);
  const assessments = count(
    (application) =>
      application.hadAssessment || application.stage === "Assessment",
  );
  const interviews = count(
    (application) => stageRank[application.stage] >= stageRank["Interview 1"],
  );
  const assessmentInterviews = count(
    (application) =>
      application.hadAssessment &&
      stageRank[application.stage] >= stageRank["Interview 1"],
  );
  const offers = count(
    (application) =>
      application.stage === "Offer" || application.outcome === "Offer",
  );
  const rejected = count((application) => application.outcome === "Rejected");

  return {
    total,
    positiveResponses,
    assessments,
    interviews,
    assessmentInterviews,
    directInterviews: interviews - assessmentInterviews,
    offers,
    rejected,
    active: count((application) => application.outcome === "Active"),
    withdrawn: count((application) => application.outcome === "Withdrawn"),
    positiveResponseRate: percentOf(positiveResponses, total),
    rejectionRate: percentOf(rejected, total),
    interviewRate: percentOf(interviews, total),
    offerRate: percentOf(offers, total),
  };
}

/**
 * The days a range covers, as [start, end), and how many days each chart
 * point groups. The calendar months use daily points; the longer ranges end
 * today and use weekly points.
 */
function momentumWindow(range: MomentumRange) {
  const today = startOfLocalDay(new Date());
  const tomorrow = addDays(today, 1);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  switch (range) {
    case "month":
      return { start: firstOfMonth, end: tomorrow, bucketSize: 1 };
    case "lastMonth":
      return {
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        end: firstOfMonth,
        bucketSize: 1,
      };
    case "3mo":
      return { start: subtractMonths(today, 3), end: tomorrow, bucketSize: 7 };
    case "6mo":
      return { start: subtractMonths(today, 6), end: tomorrow, bucketSize: 7 };
  }
}

/**
 * Applications, positive responses, and rejections per day (this month and
 * last month) or per week (3 and 6 months).
 */
export function buildMomentumSeries(
  applications: Application[],
  range: MomentumRange,
) {
  const { start, end: rangeEnd, bucketSize } = momentumWindow(range);
  const buckets = [];

  for (
    let cursor = start;
    cursor < rangeEnd;
    cursor = addDays(cursor, bucketSize)
  ) {
    const next = addDays(cursor, bucketSize);
    const end = next < rangeEnd ? next : rangeEnd;
    const labelDate = addDays(end, -1);

    const isInBucket = (value?: string) => {
      if (!value) return false;
      const date = parseLocalDate(value);
      return date >= cursor && date < end;
    };

    buckets.push({
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(labelDate),
      applications: applications.filter((item) => isInBucket(item.appliedAt))
        .length,
      positiveResponses: applications.filter(
        (item) => hasPositiveResponse(item) && isInBucket(item.responseAt),
      ).length,
      rejections: applications.filter(
        (item) => item.outcome === "Rejected" && isInBucket(item.rejectedAt),
      ).length,
    });
  }

  return buckets;
}

/**
 * Search and status filter for the applications list, pinned first and then
 * newest first. The status filter matches the stage while an application is
 * active, and the result once it has one.
 */
export function filterApplications(
  applications: Application[],
  search: string,
  statusFilter: string,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return applications
    .filter((application) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          application.company,
          application.role,
          application.companyStatus,
          application.location,
          application.source,
          application.notes,
          application.interviewDetails,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch));

      const visibleStatus =
        application.outcome === "Active"
          ? application.stage
          : application.outcome;
      const matchesStatus =
        statusFilter === "All" ||
        statusFilter === visibleStatus ||
        (statusFilter === "Active" && application.outcome === "Active");

      return matchesSearch && matchesStatus;
    })
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        parseLocalDate(b.appliedAt).getTime() -
          parseLocalDate(a.appliedAt).getTime(),
    );
}
