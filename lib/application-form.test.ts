import { describe, expect, it } from "vitest";

import {
  changeAssessment,
  changeOutcome,
  changeStage,
  newDraft,
  prepareDraftForSave,
} from "@/lib/application-form";

const today = "2026-09-29";
const draft = { ...newDraft("2026-09-01"), company: "Acme", role: "Engineer" };

describe("changeStage", () => {
  it("records a response date when moving past Applied", () => {
    expect(changeStage(draft, "Interview 1", today)).toMatchObject({
      stage: "Interview 1",
      responseAt: today,
    });
  });

  it("keeps an existing response date", () => {
    const responded = { ...draft, responseAt: "2026-09-10" };
    expect(changeStage(responded, "Interview 2", today).responseAt).toBe(
      "2026-09-10",
    );
  });

  it("sets the result to Offer and toggles the assessment", () => {
    expect(changeStage(draft, "Offer", today).outcome).toBe("Offer");
    expect(changeStage(draft, "Assessment", today).hadAssessment).toBe(true);
    const assessed = { ...draft, hadAssessment: true };
    expect(changeStage(assessed, "Applied", today).hadAssessment).toBe(false);
  });
});

describe("changeAssessment", () => {
  it("moves between Applied and Assessment", () => {
    const on = changeAssessment(draft, true, today);
    expect(on).toMatchObject({ stage: "Assessment", responseAt: today });
    expect(changeAssessment(on, false, today)).toMatchObject({
      stage: "Applied",
      responseAt: undefined,
    });
  });

  it("leaves later stages alone", () => {
    const interviewing = { ...draft, stage: "Interview 1" as const };
    expect(changeAssessment(interviewing, true, today).stage).toBe(
      "Interview 1",
    );
  });
});

describe("changeOutcome", () => {
  it("adds and clears the rejection date", () => {
    const rejected = changeOutcome(draft, "Rejected", today);
    expect(rejected.rejectedAt).toBe(today);
    expect(changeOutcome(rejected, "Active", today).rejectedAt).toBeUndefined();
  });

  it("moves the stage to Offer", () => {
    expect(changeOutcome(draft, "Offer", today)).toMatchObject({
      stage: "Offer",
      responseAt: today,
    });
  });
});

describe("prepareDraftForSave", () => {
  it("trims text and drops a removed interview", () => {
    const saved = prepareDraftForSave(
      {
        ...draft,
        company: "  Acme ",
        notes: " call back ",
        interviewAt: "2026-10-01T15:00:00.000Z",
      },
      { includeInterview: false, today },
    );
    expect(saved).toMatchObject({
      company: "Acme",
      notes: "call back",
      interviewAt: undefined,
    });
  });

  it("only keeps a response date once the application has advanced", () => {
    const withDate = { ...draft, responseAt: "2026-09-05" };
    expect(
      prepareDraftForSave(withDate, { includeInterview: true, today })
        .responseAt,
    ).toBeUndefined();
    expect(
      prepareDraftForSave(
        { ...draft, stage: "Recruiter screen" },
        { includeInterview: true, today },
      ).responseAt,
    ).toBe(today);
  });
});
