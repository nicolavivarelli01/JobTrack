import type { Application } from "@/lib/applications";
import { todayInputValue } from "@/lib/dates";

type CsvColumnDefinition = {
  key: string;
  label: string;
  value: (application: Application) => string;
};

export const csvColumns = [
  {
    key: "company",
    label: "Company",
    value: (application: Application) => application.company,
  },
  {
    key: "role",
    label: "Role",
    value: (application: Application) => application.role,
  },
  {
    key: "stage",
    label: "Highest stage reached",
    value: (application: Application) => application.stage,
  },
  {
    key: "outcome",
    label: "Current result",
    value: (application: Application) => application.outcome,
  },
  {
    key: "companyStatus",
    label: "Company status",
    value: (application: Application) => application.companyStatus ?? "",
  },
  {
    key: "appliedAt",
    label: "Applied date",
    value: (application: Application) => application.appliedAt,
  },
  {
    key: "responseAt",
    label: "First positive response date",
    value: (application: Application) => application.responseAt ?? "",
  },
  {
    key: "rejectedAt",
    label: "Rejection date",
    value: (application: Application) => application.rejectedAt ?? "",
  },
  {
    key: "hadAssessment",
    label: "Assessment included",
    value: (application: Application) =>
      application.hadAssessment ? "Yes" : "No",
  },
  {
    key: "source",
    label: "Source",
    value: (application: Application) => application.source ?? "",
  },
  {
    key: "location",
    label: "Location",
    value: (application: Application) => application.location ?? "",
  },
  {
    key: "jobUrl",
    label: "Job posting URL",
    value: (application: Application) => application.jobUrl ?? "",
  },
  {
    key: "notes",
    label: "Notes",
    value: (application: Application) => application.notes ?? "",
  },
  {
    key: "interviewAt",
    label: "Interview date and time",
    value: (application: Application) => application.interviewAt ?? "",
  },
  {
    key: "interviewLink",
    label: "Interview link",
    value: (application: Application) => application.interviewLink ?? "",
  },
  {
    key: "interviewDetails",
    label: "Interview details",
    value: (application: Application) => application.interviewDetails ?? "",
  },
] as const satisfies readonly CsvColumnDefinition[];

export type CsvColumnKey = (typeof csvColumns)[number]["key"];

// Prefixing cells that start with =, +, -, or @ stops spreadsheets from
// evaluating them as formulas.
function escapeCsvCell(value: string) {
  const spreadsheetSafeValue = /^[\t\r\n ]*[=+\-@]/.test(value)
    ? `'${value}`
    : value;
  return `"${spreadsheetSafeValue.replace(/"/g, '""')}"`;
}

export function downloadApplicationsCsv(
  applications: Application[],
  selectedKeys: Set<CsvColumnKey>,
) {
  const selectedColumns = csvColumns.filter((column) =>
    selectedKeys.has(column.key),
  );
  const rows = [
    selectedColumns.map((column) => escapeCsvCell(column.label)),
    ...applications.map((application) =>
      selectedColumns.map((column) => escapeCsvCell(column.value(application))),
    ),
  ];
  const csv = rows.map((row) => row.join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const download = document.createElement("a");

  download.href = url;
  download.download = `jobtrack-applications-${todayInputValue()}.csv`;
  document.body.appendChild(download);
  download.click();
  download.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
