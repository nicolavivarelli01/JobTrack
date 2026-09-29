import type { ColumnMapping, ImportField } from "@/lib/import/types";

type ImportFieldDefinition = {
  key: ImportField;
  label: string;
  required?: boolean;
  aliases: string[];
};

// Aliases are compared after normalizeHeader, so casing, spaces, and
// punctuation don't matter. The first alias is the label the CSV export uses,
// so exported files map back automatically.
export const importFields = [
  {
    key: "company",
    label: "Company",
    required: true,
    aliases: [
      "Company",
      "Company name",
      "Employer",
      "Organization",
      "Organisation",
      "Firm",
    ],
  },
  {
    key: "role",
    label: "Role",
    required: true,
    aliases: [
      "Role",
      "Position",
      "Job title",
      "Title",
      "Job",
      "Position title",
      "Job role",
    ],
  },
  {
    key: "appliedAt",
    label: "Applied date",
    required: true,
    aliases: [
      "Applied date",
      "Date applied",
      "Apply date",
      "Applied",
      "Applied on",
      "Application date",
      "Date of application",
      "Date",
      "Submitted",
      "Submitted on",
    ],
  },
  {
    key: "stage",
    label: "Highest stage reached",
    aliases: [
      "Highest stage reached",
      "Stage",
      "Status",
      "Application status",
      "Pipeline stage",
    ],
  },
  {
    key: "outcome",
    label: "Current result",
    aliases: [
      "Current result",
      "Result",
      "Outcome",
      "Status",
      "Application status",
    ],
  },
  {
    key: "companyStatus",
    label: "Company status",
    aliases: ["Company status", "Portal status"],
  },
  {
    key: "responseAt",
    label: "First positive response date",
    aliases: [
      "First positive response date",
      "Response date",
      "Date of response",
    ],
  },
  {
    key: "rejectedAt",
    label: "Rejection date",
    aliases: [
      "Rejection date",
      "Rejected date",
      "Rejected on",
      "Date rejected",
    ],
  },
  {
    key: "hadAssessment",
    label: "Assessment included",
    aliases: [
      "Assessment included",
      "Assessment",
      "Had assessment",
      "Online assessment",
      "OA",
      "Take home",
    ],
  },
  {
    key: "source",
    label: "Source",
    aliases: [
      "Source",
      "Via",
      "Platform",
      "Channel",
      "Job board",
      "Where applied",
    ],
  },
  {
    key: "location",
    label: "Location",
    aliases: ["Location", "City", "Office", "Place"],
  },
  {
    key: "jobUrl",
    label: "Job posting URL",
    aliases: [
      "Job posting URL",
      "URL",
      "Link",
      "Job link",
      "Job URL",
      "Posting",
      "Posting URL",
    ],
  },
  {
    key: "notes",
    label: "Notes",
    aliases: ["Notes", "Note", "Comments", "Comment", "Remarks"],
  },
  {
    key: "interviewAt",
    label: "Interview date and time",
    aliases: [
      "Interview date and time",
      "Interview date",
      "Interview time",
      "Next interview",
    ],
  },
  {
    key: "interviewLink",
    label: "Interview link",
    aliases: ["Interview link", "Meeting link", "Zoom link"],
  },
  {
    key: "interviewDetails",
    label: "Interview details",
    aliases: ["Interview details", "Interview notes"],
  },
] as const satisfies readonly ImportFieldDefinition[];

export function isRequiredField(field: (typeof importFields)[number]) {
  return "required" in field && field.required;
}

export function fieldLabel(key: ImportField) {
  return importFields.find((field) => field.key === key)?.label ?? key;
}

export function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Matches each field to the first header equal to one of its aliases. Earlier
 * aliases win, so "Stage" beats "Status"; a lone "Status" column maps to both
 * stage and result on purpose.
 */
export function guessMapping(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map(normalizeHeader);
  const mapping = {} as ColumnMapping;

  for (const field of importFields) {
    const column = field.aliases
      .map((alias) => normalizedHeaders.indexOf(normalizeHeader(alias)))
      .find((index) => index !== -1);
    mapping[field.key] = column ?? null;
  }

  return mapping;
}
