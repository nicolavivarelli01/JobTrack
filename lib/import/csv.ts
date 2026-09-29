import type { SheetData } from "@/lib/import/types";

/** Picks comma, semicolon, or tab: whichever appears most in the header row. */
function detectDelimiter(text: string) {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  let best = ",";
  let bestCount = 0;

  for (const candidate of [",", ";", "\t"]) {
    let count = 0;
    let quoted = false;
    for (const char of firstLine) {
      if (char === '"') quoted = !quoted;
      else if (!quoted && char === candidate) count += 1;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

// Undoes the apostrophe our CSV export adds in front of =, +, -, and @.
function unescapeSpreadsheetValue(value: string) {
  return /^'[\t\r\n ]*[=+\-@]/.test(value) ? value.slice(1) : value;
}

/**
 * RFC 4180 parser that also accepts semicolon- and tab-separated files, which
 * is what Excel writes in locales that use a decimal comma. Cells are trimmed
 * and fully empty rows are dropped.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows
    .map((cells) =>
      cells.map((value) => unescapeSpreadsheetValue(value.trim())),
    )
    .filter((cells) => cells.some((value) => value !== ""));
}

export function sheetFromCsv(text: string): SheetData {
  const [headers = [], ...rows] = parseCsv(text);
  return { headers, rows, redCells: new Set(), links: new Map() };
}
