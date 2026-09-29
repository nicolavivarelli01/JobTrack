import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { cellKey } from "@/lib/import/types";
import { isRedFill, readXlsx } from "@/lib/import/xlsx";

const solid = (argb: string) =>
  ({ type: "pattern", pattern: "solid", fgColor: { argb } }) as const;

describe("isRedFill", () => {
  it.each(["FFFF0000", "FFC00000", "FFFFC7CE", "FFF4CCCC", "FFEA9999"])(
    "treats %s as red",
    (argb) => expect(isRedFill(solid(argb))).toBe(true),
  );

  it.each([
    "FFFFC000",
    "FFED7D31",
    "FFC9DAF8",
    "FFFFFFFF",
    "FF000000",
    "FFFF00FF",
  ])("does not treat %s as red", (argb) =>
    expect(isRedFill(solid(argb))).toBe(false),
  );
});

describe("readXlsx", () => {
  it("reads values, dates, red fills, and hyperlinks", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Applications");
    sheet.addRow(["Company", "Role", "Apply Date", "1st contact"]);
    sheet.addRow([
      "Acme",
      { text: "Data Scientist", hyperlink: "https://jobs.example.com/1" },
      new Date(Date.UTC(2026, 7, 27)),
      "",
    ]);
    sheet.addRow([]);
    sheet.addRow(["Beta", "Analyst", new Date(Date.UTC(2026, 8, 3)), ""]);
    sheet.getCell("D2").fill = solid("FFFF0000");

    const buffer = await workbook.xlsx.writeBuffer();
    const result = await readXlsx(buffer as ArrayBuffer);

    expect(result.headers).toEqual([
      "Company",
      "Role",
      "Apply Date",
      "1st contact",
    ]);
    expect(result.rows).toEqual([
      ["Acme", "Data Scientist", "2026-08-27", ""],
      ["Beta", "Analyst", "2026-09-03", ""],
    ]);
    expect([...result.redCells]).toEqual([cellKey(0, 3)]);
    expect(result.links.get(cellKey(0, 1))).toBe("https://jobs.example.com/1");
  });
});
