import { describe, expect, it } from "vitest";

import { parseCsv, sheetFromCsv } from "@/lib/import/csv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, and newlines inside cells", () => {
    const csv = 'Company,Notes\r\n"Acme, Inc","Said ""hi""\nthen left"\r\n';
    expect(parseCsv(csv)).toEqual([
      ["Company", "Notes"],
      ["Acme, Inc", 'Said "hi"\nthen left'],
    ]);
  });

  it("detects semicolon and tab delimiters", () => {
    expect(parseCsv("a;b\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips the BOM, trims cells, and drops empty rows", () => {
    expect(parseCsv("\uFEFFCompany , Role\n,,\nAcme ,Engineer \n")).toEqual([
      ["Company", "Role"],
      ["Acme", "Engineer"],
    ]);
  });

  it("undoes the formula-safety apostrophe added by the export", () => {
    expect(parseCsv("Notes\n'- call back")).toEqual([
      ["Notes"],
      ["- call back"],
    ]);
    expect(parseCsv("Notes\n'quoted")).toEqual([["Notes"], ["'quoted"]]);
  });
});

describe("sheetFromCsv", () => {
  it("splits the header row from the data rows", () => {
    const sheet = sheetFromCsv("Company,Role\nAcme,Engineer");
    expect(sheet.headers).toEqual(["Company", "Role"]);
    expect(sheet.rows).toEqual([["Acme", "Engineer"]]);
    expect(sheet.redCells.size).toBe(0);
  });
});
