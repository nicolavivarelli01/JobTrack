import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Application } from "@/lib/applications";
import {
  buildMomentumSeries,
  computeMetrics,
  filterApplications,
} from "@/lib/metrics";

function application(overrides: Partial<Application>): Application {
  return {
    id: overrides.company ?? "id",
    company: "Acme",
    role: "Engineer",
    stage: "Applied",
    outcome: "Active",
    appliedAt: "2026-09-01",
    hadAssessment: false,
    pinned: false,
    ...overrides,
  };
}

const applications = [
  application({ company: "A" }),
  application({ company: "B", stage: "Assessment", hadAssessment: true }),
  application({ company: "C", stage: "Interview 2", hadAssessment: true }),
  application({ company: "D", stage: "Interview 1" }),
  application({ company: "E", stage: "Offer", outcome: "Offer" }),
  application({ company: "F", outcome: "Rejected", rejectedAt: "2026-09-10" }),
  application({
    company: "G",
    stage: "Recruiter screen",
    outcome: "Withdrawn",
  }),
  application({ company: "H", pinned: true, appliedAt: "2026-08-01" }),
];

describe("computeMetrics", () => {
  it("counts the funnel", () => {
    expect(computeMetrics(applications)).toMatchObject({
      total: 8,
      positiveResponses: 5,
      assessments: 2,
      interviews: 3,
      assessmentInterviews: 1,
      directInterviews: 2,
      offers: 1,
      rejected: 1,
      active: 5,
      withdrawn: 1,
      positiveResponseRate: 63,
      interviewRate: 38,
    });
  });

  it("returns zero rates for no applications", () => {
    expect(computeMetrics([]).positiveResponseRate).toBe(0);
  });
});

describe("filterApplications", () => {
  it("puts pinned first, then newest", () => {
    const sorted = filterApplications(
      [
        application({ company: "Old", appliedAt: "2026-01-01" }),
        application({ company: "New", appliedAt: "2026-09-01" }),
        application({
          company: "Pinned",
          appliedAt: "2025-01-01",
          pinned: true,
        }),
      ],
      "",
      "All",
    );
    expect(sorted.map((item) => item.company)).toEqual([
      "Pinned",
      "New",
      "Old",
    ]);
  });

  it("matches the stage while active and the result otherwise", () => {
    const byStatus = (status: string) =>
      filterApplications(applications, "", status).map((item) => item.company);
    expect(byStatus("Interview 2")).toEqual(["C"]);
    expect(byStatus("Rejected")).toEqual(["F"]);
    expect(byStatus("Active")).toHaveLength(5);
  });

  it("searches across text fields, case-insensitively", () => {
    const results = filterApplications(
      [application({ company: "Stripe", notes: "Recruiter: Dana" })],
      "dana",
      "All",
    );
    expect(results).toHaveLength(1);
  });
});

describe("buildMomentumSeries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 29, 12));
  });
  afterEach(() => vi.useRealTimers());

  it("buckets this month by day", () => {
    const series = buildMomentumSeries(
      [
        application({ appliedAt: "2026-09-01" }),
        application({
          appliedAt: "2026-09-01",
          stage: "Interview 1",
          responseAt: "2026-09-05",
        }),
        application({ outcome: "Rejected", rejectedAt: "2026-09-10" }),
      ],
      "month",
    );

    expect(series).toHaveLength(29);
    expect(series[0]).toMatchObject({ label: "Sep 1", applications: 3 });
    expect(series[4].positiveResponses).toBe(1);
    expect(series[9].rejections).toBe(1);
  });

  it("shows every day of the previous month", () => {
    const series = buildMomentumSeries(
      [
        application({ appliedAt: "2026-08-31" }),
        application({ appliedAt: "2026-09-01" }),
        application({ appliedAt: "2026-09-30" }),
        application({ appliedAt: "2026-09-29" }),
      ],
      "lastMonth",
    );

    // Today is Sep 29, so last month is August.
    expect(series).toHaveLength(31);
    expect(series[0].label).toBe("Aug 1");
    expect(series[30]).toMatchObject({ label: "Aug 31", applications: 1 });
    expect(series.reduce((sum, day) => sum + day.applications, 0)).toBe(1);
  });

  it("wraps last month back to December in January", () => {
    vi.setSystemTime(new Date(2027, 0, 15, 12));
    const series = buildMomentumSeries([], "lastMonth");
    expect(series).toHaveLength(31);
    expect(series[0].label).toBe("Dec 1");
    expect(series[30].label).toBe("Dec 31");
  });

  it("handles a short previous month", () => {
    vi.setSystemTime(new Date(2027, 2, 3, 12));
    expect(buildMomentumSeries([], "lastMonth")).toHaveLength(28);
  });

  it("buckets longer ranges by week", () => {
    expect(buildMomentumSeries([], "3mo").length).toBeLessThan(15);
  });
});
