import type { CellValue, Fill, Workbook, Worksheet } from "exceljs";

import type { SheetData } from "@/lib/csv-import";

// Legacy palette entries that are red (Excel 97 "indexed" colors).
const indexedColors: Record<number, string> = {
  2: "FF0000",
  10: "FF0000",
  16: "800000",
  29: "FF8080",
  53: "993300",
};

function isRedRgb(hex: string) {
  const rgb = hex.slice(-6);
  const r = parseInt(rgb.slice(0, 2), 16) / 255;
  const g = parseInt(rgb.slice(2, 4), 16) / 255;
  const b = parseInt(rgb.slice(4, 6), 16) / 255;
  if ([r, g, b].some(Number.isNaN)) return false;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return false;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;

  // Covers pure red, dark red, and the pale "light red" fills that Excel and
  // Google Sheets offer, but not orange, pink-purple, or grey.
  return (
    (hue >= 345 || hue <= 15) &&
    saturation >= 0.5 &&
    lightness >= 0.2 &&
    lightness <= 0.92
  );
}

/** True when a cell has a solid red background. */
export function isRedFill(fill: Fill | undefined) {
  if (!fill || fill.type !== "pattern" || fill.pattern === "none") return false;
  const color = fill.fgColor ?? fill.bgColor;
  if (!color) return false;
  if (color.argb) return isRedRgb(color.argb);
  const indexed = (color as { indexed?: number }).indexed;
  return indexed !== undefined && indexedColors[indexed] !== undefined;
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
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("formula" in value || "sharedFormula" in value) {
    return cellText((value as { result?: CellValue }).result ?? null);
  }
  if ("hyperlink" in value) return cellText((value as { text: CellValue }).text);
  if ("error" in value) return "";
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

/**
 * Reads the first sheet of an .xlsx workbook into the same shape as a parsed
 * CSV, plus the two things a CSV export loses: red cell fills and hyperlinks.
 */
export async function readXlsx(data: ArrayBuffer): Promise<SheetData> {
  // Loaded on demand so the dashboard bundle does not carry the parser.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);

  const sheet = firstSheetWithData(workbook);
  if (!sheet) return { headers: [], rows: [], redCells: new Set(), links: new Map() };

  const columnCount = sheet.columnCount;
  const table: { values: string[]; red: number[]; links: (string | undefined)[] }[] = [];

  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    const red: number[] = [];
    const links: (string | undefined)[] = [];
    for (let column = 1; column <= columnCount; column += 1) {
      const cell = row.getCell(column);
      values.push(cellText(cell.value).trim());
      links.push(cellHyperlink(cell.value, cell.hyperlink));
      if (isRedFill(cell.fill)) red.push(column - 1);
    }
    table.push({ values, red, links });
  });

  const [header, ...body] = table;
  if (!header) return { headers: [], rows: [], redCells: new Set(), links: new Map() };

  const dataRows = body.filter((row) => row.values.some((value) => value !== ""));
  const redCells = new Set<string>();
  const links = new Map<string, string>();
  dataRows.forEach((row, index) => {
    for (const column of row.red) redCells.add(`${index}:${column}`);
    row.links.forEach((link, column) => {
      if (link) links.set(`${index}:${column}`, link);
    });
  });

  return {
    headers: header.values,
    rows: dataRows.map((row) => row.values),
    redCells,
    links,
  };
}
