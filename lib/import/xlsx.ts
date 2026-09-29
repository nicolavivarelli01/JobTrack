import type { CellValue, Fill, Workbook, Worksheet } from "exceljs";

import { cellKey, type SheetData } from "@/lib/import/types";

// Legacy Excel 97 palette entries that are red.
const indexedReds = new Set([2, 10, 16, 29, 53]);

function isRedRgb(hex: string) {
  const rgb = hex.slice(-6);
  const r = parseInt(rgb.slice(0, 2), 16) / 255;
  const g = parseInt(rgb.slice(2, 4), 16) / 255;
  const b = parseInt(rgb.slice(4, 6), 16) / 255;
  if ([r, g, b].some(Number.isNaN)) return false;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return false;

  const lightness = (max + min) / 2;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue =
    max === r
      ? 60 * (((g - b) / delta) % 6)
      : max === g
        ? 60 * ((b - r) / delta + 2)
        : 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;

  // Pure, dark, and the pale "light red" fills Excel and Google Sheets offer,
  // but not orange, magenta, or grey.
  return (
    (hue >= 345 || hue <= 15) &&
    saturation >= 0.5 &&
    lightness >= 0.2 &&
    lightness <= 0.92
  );
}

/** True for a solid red cell background. Theme colors are not resolved. */
export function isRedFill(fill: Fill | undefined) {
  if (!fill || fill.type !== "pattern" || fill.pattern === "none") return false;
  const color = fill.fgColor ?? fill.bgColor;
  if (!color) return false;
  if (color.argb) return isRedRgb(color.argb);
  const indexed = (color as { indexed?: number }).indexed;
  return indexed !== undefined && indexedReds.has(indexed);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

// exceljs returns date cells as Date objects whose UTC fields hold the
// spreadsheet's wall-clock time.
function formatSpreadsheetDate(date: Date) {
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  return hours || minutes ? `${day} ${pad(hours)}:${pad(minutes)}` : day;
}

function cellText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatSpreadsheetDate(value);
  if (typeof value !== "object") return String(value);
  if ("richText" in value)
    return value.richText.map((part) => part.text).join("");
  if ("formula" in value || "sharedFormula" in value) {
    return cellText((value as { result?: CellValue }).result ?? null);
  }
  if ("hyperlink" in value)
    return cellText((value as { text: CellValue }).text);
  return "";
}

function cellHyperlink(value: CellValue, hyperlink: string | undefined) {
  const link =
    hyperlink ??
    (value && typeof value === "object" && "hyperlink" in value
      ? (value as { hyperlink: string }).hyperlink
      : undefined);
  return link && /^https?:\/\//i.test(link) ? link : undefined;
}

function firstSheetWithData(workbook: Workbook): Worksheet | undefined {
  return workbook.worksheets.find(
    (sheet) => sheet.state !== "hidden" && sheet.actualRowCount > 0,
  );
}

const emptySheet = (): SheetData => ({
  headers: [],
  rows: [],
  redCells: new Set(),
  links: new Map(),
});

/**
 * Reads the first visible sheet of an .xlsx workbook into the same shape as a
 * parsed CSV, plus the two things a CSV export loses: red fills and links.
 */
export async function readXlsx(data: ArrayBuffer): Promise<SheetData> {
  // Loaded on demand so the dashboard bundle doesn't carry the parser.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);

  const worksheet = firstSheetWithData(workbook);
  if (!worksheet) return emptySheet();

  const table: {
    values: string[];
    red: number[];
    links: (string | undefined)[];
  }[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    const red: number[] = [];
    const links: (string | undefined)[] = [];
    for (let column = 1; column <= worksheet.columnCount; column += 1) {
      const cell = row.getCell(column);
      values.push(cellText(cell.value).trim());
      links.push(cellHyperlink(cell.value, cell.hyperlink));
      if (isRedFill(cell.fill)) red.push(column - 1);
    }
    table.push({ values, red, links });
  });

  const [header, ...body] = table;
  if (!header) return emptySheet();

  const sheet = emptySheet();
  sheet.headers = header.values;
  body
    .filter((row) => row.values.some((value) => value !== ""))
    .forEach((row, index) => {
      sheet.rows.push(row.values);
      for (const column of row.red) sheet.redCells.add(cellKey(index, column));
      row.links.forEach((link, column) => {
        if (link) sheet.links.set(cellKey(index, column), link);
      });
    });

  return sheet;
}
