import { describe, expect, it } from "vitest";

import {
  detectDateOrder,
  normalizeUrl,
  parseBoolean,
  parseDateValue,
} from "@/lib/import/values";

describe("parseDateValue", () => {
  it("reads numeric dates in the given order", () => {
    expect(parseDateValue("03/04/2025", "mdy")).toBe("2025-03-04");
    expect(parseDateValue("03/04/2025", "dmy")).toBe("2025-04-03");
    expect(parseDateValue("1/2/25", "mdy")).toBe("2025-01-02");
  });

  it("always reads ISO dates as year-month-day", () => {
    expect(parseDateValue("2025-09-23", "dmy")).toBe("2025-09-23");
    expect(parseDateValue("2025-09-23 10:00", "mdy")).toBe("2025-09-23");
  });

  it("reads Excel serials and written-out dates", () => {
    expect(parseDateValue("45923", "mdy")).toBe("2025-09-23");
    expect(parseDateValue("Sep 5, 2025", "mdy")).toBe("2025-09-05");
  });

  it("rejects impossible dates and non-dates", () => {
    expect(parseDateValue("31/02/2025", "dmy")).toBeNull();
    expect(parseDateValue("Yes", "mdy")).toBeNull();
    expect(parseDateValue("12345", "mdy")).toBeNull();
  });
});

describe("detectDateOrder", () => {
  it("uses a day above 12 to decide", () => {
    expect(detectDateOrder(["23/09/2025"])).toEqual({
      order: "dmy",
      ambiguous: false,
    });
    expect(detectDateOrder(["08/27/26"])).toEqual({
      order: "mdy",
      ambiguous: false,
    });
  });

  it("flags files where every date fits both orders", () => {
    expect(detectDateOrder(["01/02/2025", "03/04/2025"])).toEqual({
      order: "mdy",
      ambiguous: true,
    });
    expect(detectDateOrder(["2025-01-02"]).ambiguous).toBe(false);
  });
});

describe("parseBoolean and normalizeUrl", () => {
  it("accepts common yes values", () => {
    expect(["Yes", "y", "TRUE", "1", "x", "sì"].every(parseBoolean)).toBe(true);
    expect(parseBoolean("no")).toBe(false);
  });

  it("adds https to bare domains only", () => {
    expect(normalizeUrl("acme.com/jobs/1")).toBe("https://acme.com/jobs/1");
    expect(normalizeUrl("http://acme.com")).toBe("http://acme.com");
    expect(normalizeUrl("see portal")).toBe("see portal");
  });
});
