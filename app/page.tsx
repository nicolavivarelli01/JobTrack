"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  Check,
  CircleDot,
  Cloud,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Share2,
  Smartphone,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import {
  AuthScreen,
  LoadingScreen,
  PasswordRecoveryScreen,
  SetupScreen,
} from "@/components/auth-screen";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { CompanyAvatar } from "@/components/company-avatar";
import { ImportCsvDialog } from "@/components/import-csv-dialog";
import {
  outcomes,
  stages,
  type Application,
  type ApplicationDraft,
  type Outcome,
  type Stage,
} from "@/lib/applications";

const momentumRanges = [
  { value: "month", label: "This month" },
  { value: "3mo", label: "3mo" },
  { value: "6mo", label: "6mo" },
] as const;

type MomentumRange = (typeof momentumRanges)[number]["value"];
type StoredStage = Stage | "Interview";

type StoredApplication = Omit<Application, "stage" | "hadAssessment" | "pinned"> & {
  stage: StoredStage;
  hadAssessment?: boolean;
};

type ApplicationRow = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  stage: Stage;
  outcome: Outcome;
  company_status: string | null;
  applied_at: string;
  response_at: string | null;
  source: string | null;
  location: string | null;
  job_url: string | null;
  notes: string | null;
  interview_at: string | null;
  interview_link: string | null;
  interview_details: string | null;
  rejected_at: string | null;
  had_assessment: boolean;
  pinned: boolean;
  legacy_id: string | null;
};

const storageKey = "jobtrack.applications.v1";
const applicationColumns =
  "id,user_id,company,role,stage,outcome,company_status,applied_at,response_at,source,location,job_url,notes,interview_at,interview_link,interview_details,rejected_at,had_assessment,pinned,legacy_id";

const activityConfig = {
  applications: {
    label: "Applications",
    color: "#5ee3c2",
  },
  positiveResponses: {
    label: "Positive responses",
    color: "#7aa7ff",
  },
  rejections: {
    label: "Rejections",
    color: "#ff6b74",
  },
} satisfies ChartConfig;

const outcomeColors: Record<Outcome, string> = {
  Active: "#5ee3c2",
  Rejected: "#ff6b74",
  Offer: "#ffb562",
  Withdrawn: "#71869b",
};

const stageRank: Record<Stage, number> = {
  Applied: 0,
  Assessment: 1,
  "Recruiter screen": 2,
  "Interview 1": 3,
  "Interview 2": 4,
  "Interview 3": 5,
  "Interview 4+": 6,
  Offer: 7,
};

const momentumDescriptions: Record<MomentumRange, string> = {
  month: "Daily applications, positive responses, and rejections this month",
  "3mo": "Weekly applications, positive responses, and rejections over 3 months",
  "6mo": "Weekly applications, positive responses, and rejections over 6 months",
};

type CsvColumnDefinition = {
  key: string;
  label: string;
  value: (application: Application) => string;
};

const csvColumns = [
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

type CsvColumnKey = (typeof csvColumns)[number]["key"];

function applicationFromRow(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    stage: row.stage,
    outcome: row.outcome,
    companyStatus: row.company_status ?? undefined,
    appliedAt: row.applied_at,
    responseAt: row.response_at ?? undefined,
    source: row.source ?? undefined,
    location: row.location ?? undefined,
    jobUrl: row.job_url ?? undefined,
    notes: row.notes ?? undefined,
    interviewAt: row.interview_at ?? undefined,
    interviewLink: row.interview_link ?? undefined,
    interviewDetails: row.interview_details ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    hadAssessment: row.had_assessment || row.stage === "Assessment",
    pinned: row.pinned,
  };
}

function databaseFields(draft: ApplicationDraft) {
  return {
    company: draft.company,
    role: draft.role,
    stage: draft.stage,
    outcome: draft.outcome,
    company_status: draft.companyStatus || null,
    applied_at: draft.appliedAt,
    response_at: draft.responseAt || null,
    source: draft.source || null,
    location: draft.location || null,
    job_url: draft.jobUrl || null,
    notes: draft.notes || null,
    interview_at: draft.interviewAt || null,
    interview_link: draft.interviewLink || null,
    interview_details: draft.interviewDetails || null,
    rejected_at: draft.rejectedAt || null,
    had_assessment: draft.hadAssessment || draft.stage === "Assessment",
  };
}

function isStoredApplication(value: unknown): value is StoredApplication {
  if (!value || typeof value !== "object") return false;

  const application = value as Partial<StoredApplication>;
  return (
    typeof application.id === "string" &&
    typeof application.company === "string" &&
    typeof application.role === "string" &&
    typeof application.appliedAt === "string" &&
    [...stages, "Interview"].includes(application.stage as StoredStage) &&
    outcomes.includes(application.outcome as Outcome)
  );
}

function normalizeStoredApplication(
  application: StoredApplication,
): Application {
  return {
    ...application,
    stage: application.stage === "Interview" ? "Interview 1" : application.stage,
    hadAssessment:
      application.hadAssessment || application.stage === "Assessment",
    rejectedAt:
      application.outcome === "Rejected"
        ? application.rejectedAt || application.responseAt || application.appliedAt
        : application.rejectedAt,
    pinned: false,
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function parseLocalDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseLocalDate(value));
}

function formatDateTime(value?: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateTimeInputValue(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromDateTimeInputValue(value: string) {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function escapeCsvCell(value: string) {
  const spreadsheetSafeValue = /^[\t\r\n ]*[=+\-@]/.test(value)
    ? `'${value}`
    : value;
  return `"${spreadsheetSafeValue.replace(/"/g, '""')}"`;
}

function downloadApplicationsCsv(
  applications: Application[],
  selectedKeys: Set<CsvColumnKey>,
) {
  const selectedColumns = csvColumns.filter((column) =>
    selectedKeys.has(column.key),
  );
  const rows = [
    selectedColumns.map((column) => escapeCsvCell(column.label)),
    ...applications.map((application) =>
      selectedColumns.map((column) =>
        escapeCsvCell(column.value(application)),
      ),
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

function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function subtractMonths(value: Date, months: number) {
  const target = new Date(value.getFullYear(), value.getMonth() - months, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(value.getDate(), lastDay));
  return target;
}

function buildMomentumSeries(
  applications: Application[],
  range: MomentumRange,
) {
  const today = startOfLocalDay(new Date());
  const tomorrow = addDays(today, 1);
  const start =
    range === "month"
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : subtractMonths(today, range === "3mo" ? 3 : 6);
  const bucketSize = range === "month" ? 1 : 7;
  const buckets = [];

  for (let cursor = start; cursor < tomorrow; cursor = addDays(cursor, bucketSize)) {
    const next = addDays(cursor, bucketSize);
    const end = next < tomorrow ? next : tomorrow;
    const labelDate = addDays(end, -1);

    const isInBucket = (value?: string) => {
      if (!value) return false;
      const date = parseLocalDate(value);
      return date >= cursor && date < end;
    };

    buckets.push({
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(labelDate),
      applications: applications.filter((item) => isInBucket(item.appliedAt))
        .length,
      positiveResponses: applications.filter(
        (item) =>
          (item.hadAssessment ||
            item.stage !== "Applied" ||
            item.outcome === "Offer") &&
          isInBucket(item.responseAt),
      ).length,
      rejections: applications.filter(
        (item) =>
          item.outcome === "Rejected" && isInBucket(item.rejectedAt),
      ).length,
    });
  }

  return buckets;
}

function stageBadgeClass(stage: Stage) {
  switch (stage) {
    case "Assessment":
      return "border-[#7aa7ff]/30 bg-[#7aa7ff]/10 text-[#a8c4ff]";
    case "Recruiter screen":
      return "border-[#a998ff]/30 bg-[#a998ff]/10 text-[#c9bdff]";
    case "Interview 1":
    case "Interview 2":
    case "Interview 3":
    case "Interview 4+":
      return "border-[#ffb562]/30 bg-[#ffb562]/10 text-[#ffd09a]";
    case "Offer":
      return "border-[#5ee3c2]/30 bg-[#5ee3c2]/10 text-[#8cf0d7]";
    default:
      return "border-[#71869b]/30 bg-[#71869b]/10 text-[#a9bac9]";
  }
}

function outcomeBadgeClass(outcome: Outcome) {
  switch (outcome) {
    case "Rejected":
      return "border-[#ff6b74]/30 bg-[#ff6b74]/10 text-[#ff9da4]";
    case "Offer":
      return "border-[#5ee3c2]/30 bg-[#5ee3c2]/10 text-[#8cf0d7]";
    case "Withdrawn":
      return "border-[#71869b]/30 bg-[#71869b]/10 text-[#a9bac9]";
    default:
      return "border-[#5ee3c2]/20 bg-[#5ee3c2]/8 text-[#8cf0d7]";
  }
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Activity;
  accent: string;
  delay: string;
}) {
  return (
    <Card
      className="rise-in gap-4 border-white/[0.07] bg-card/85 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.16)]"
      style={{ animationDelay: delay }}
    >
      <CardContent className="flex items-start justify-between px-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-foreground">
            {value}
          </p>
          <p className="mt-2 text-sm text-[#71869b]">{detail}</p>
        </div>
        <div
          className="flex size-10 items-center justify-center rounded-lg border border-white/[0.07]"
          style={{ backgroundColor: `${accent}12`, color: accent }}
        >
          <Icon className="size-[1.15rem]" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

function FlowNode({
  label,
  value,
  percentage,
  tone = "default",
  className = "",
}: {
  label: string;
  value: number;
  percentage: number;
  tone?: "default" | "success" | "danger" | "assessment" | "interview";
  className?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "border-[#ff6b74]/25 bg-[#ff6b74]/8"
      : tone === "success"
        ? "border-[#5ee3c2]/25 bg-[#5ee3c2]/8"
          : tone === "assessment"
            ? "border-[#7aa7ff]/25 bg-[#7aa7ff]/8"
            : tone === "interview"
              ? "border-[#ffb562]/25 bg-[#ffb562]/8"
              : "border-white/[0.08] bg-white/[0.025]";

  return (
    <div
      className={`flex min-w-40 flex-col justify-between rounded-xl border px-4 py-4 ${toneClass} ${className}`}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <span className="text-2xl font-semibold tracking-[-0.04em]">{value}</span>
        <span className="shrink-0 rounded-full border border-white/[0.06] bg-black/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#8ba0b4]">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

function ApplicationFlow({
  total,
  assessments,
  interviews,
  directInterviews,
  assessmentInterviews,
  offers,
  rejected,
}: {
  total: number;
  assessments: number;
  interviews: number;
  directInterviews: number;
  assessmentInterviews: number;
  offers: number;
  rejected: number;
}) {
  const percentage = (value: number) =>
    total ? Math.round((value / total) * 100) : 0;

  const nodes = {
    applications: (
      <FlowNode
        label="Applications"
        value={total}
        percentage={total ? 100 : 0}
        className="h-full"
      />
    ),
    rejections: (
      <FlowNode
        label="Rejections"
        value={rejected}
        percentage={percentage(rejected)}
        tone="danger"
        className="h-full"
      />
    ),
    assessments: (
      <FlowNode
        label="Assessments"
        value={assessments}
        percentage={percentage(assessments)}
        tone="assessment"
        className="h-full"
      />
    ),
    interviews: (
      <FlowNode
        label="Interviews"
        value={interviews}
        percentage={percentage(interviews)}
        tone="interview"
        className="h-full"
      />
    ),
    offers: (
      <FlowNode
        label="Offers"
        value={offers}
        percentage={percentage(offers)}
        tone="success"
        className="h-full"
      />
    ),
  };

  return (
    <>
      <div
        className="relative hidden h-[310px] lg:block"
        role="img"
        aria-label="Applications can end in rejection, include an assessment, or move directly to interview. Assessments can also lead to interviews, and interviews can lead to offers."
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1000 310"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="flow-arrow-neutral"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0L8 4L0 8Z" fill="#607991" />
            </marker>
            <marker
              id="flow-arrow-danger"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0L8 4L0 8Z" fill="#ff6b74" />
            </marker>
            <marker
              id="flow-arrow-assessment"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0L8 4L0 8Z" fill="#7aa7ff" />
            </marker>
          </defs>

          <path
            d="M190 155H235"
            fill="none"
            stroke="#607991"
            strokeOpacity=".55"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M235 52V258"
            fill="none"
            stroke="#607991"
            strokeOpacity=".42"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M235 52H280"
            fill="none"
            stroke="#ff6b74"
            strokeOpacity=".7"
            strokeWidth="1.5"
            markerEnd="url(#flow-arrow-danger)"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M235 258H280"
            fill="none"
            stroke="#7aa7ff"
            strokeOpacity=".75"
            strokeWidth="1.5"
            markerEnd="url(#flow-arrow-assessment)"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M190 155C340 155 430 140 570 140"
            fill="none"
            stroke="#607991"
            strokeOpacity=".72"
            strokeWidth="1.5"
            markerEnd="url(#flow-arrow-neutral)"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M470 258C530 258 515 175 570 175"
            fill="none"
            stroke="#7aa7ff"
            strokeOpacity=".75"
            strokeWidth="1.5"
            markerEnd="url(#flow-arrow-assessment)"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M760 155H810"
            fill="none"
            stroke="#5ee3c2"
            strokeOpacity=".7"
            strokeWidth="1.5"
            markerEnd="url(#flow-arrow-neutral)"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="absolute left-0 top-1/2 z-10 h-[104px] w-[19%] -translate-y-1/2">
          {nodes.applications}
        </div>
        <div className="absolute left-[28%] top-0 z-10 h-[104px] w-[19%]">
          {nodes.rejections}
        </div>
        <div className="absolute bottom-0 left-[28%] z-10 h-[104px] w-[19%]">
          {nodes.assessments}
        </div>
        <div className="absolute left-[57%] top-1/2 z-10 h-[104px] w-[19%] -translate-y-1/2">
          {nodes.interviews}
        </div>
        <div className="absolute left-[81%] top-1/2 z-10 h-[104px] w-[19%] -translate-y-1/2">
          {nodes.offers}
        </div>

        <span className="absolute left-[39%] top-[39%] z-20 -translate-x-1/2 rounded-full border border-white/[0.07] bg-[#0b1722] px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm">
          Direct to interview · {directInterviews}
        </span>
        <span className="absolute left-[51%] top-[72%] z-20 -translate-x-1/2 rounded-full border border-[#7aa7ff]/15 bg-[#0b1722] px-2.5 py-1 text-[11px] text-[#9dbbfa] shadow-sm">
          After assessment · {assessmentInterviews}
        </span>
      </div>

      <div className="space-y-3 lg:hidden">
        <div className="h-[96px]">{nodes.applications}</div>
        <div className="flex justify-center">
          <ArrowDown className="size-4 text-[#607991]" aria-hidden="true" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-[96px]">{nodes.rejections}</div>
          <div className="h-[96px]">{nodes.assessments}</div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#07131e] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Paths into interviews
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/[0.045] px-2.5 py-1 text-[#a8bacb]">
              Direct from application · {directInterviews}
            </span>
            <span className="rounded-full bg-[#7aa7ff]/10 px-2.5 py-1 text-[#a8c4ff]">
              After assessment · {assessmentInterviews}
            </span>
          </div>
        </div>
        <div className="flex justify-center">
          <ArrowDown className="size-4 text-[#607991]" aria-hidden="true" />
        </div>
        <div className="h-[96px]">{nodes.interviews}</div>
        <div className="flex justify-center">
          <ArrowDown className="size-4 text-[#5ee3c2]/70" aria-hidden="true" />
        </div>
        <div className="h-[96px]">{nodes.offers}</div>
      </div>
    </>
  );
}

function EmptyApplications({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <BriefcaseBusiness className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Add your first application</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Your dashboard and response flow will update automatically.
      </p>
      <Button className="mt-5" onClick={onAdd}>
        <Plus aria-hidden="true" />
        Add application
      </Button>
    </div>
  );
}

function PinnedIndicator() {
  return (
    <span title="Pinned" className="shrink-0 text-[#ffb562]">
      <Pin className="size-3.5 fill-current" aria-hidden="true" />
      <span className="sr-only">Pinned</span>
    </span>
  );
}

function ApplicationActions({
  application,
  onEdit,
  onTogglePin,
  onDelete,
}: {
  application: Application;
  onEdit: (application: Application) => void;
  onTogglePin: (application: Application) => void;
  onDelete: (application: Application) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${application.company}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onSelect={() => onEdit(application)}>
          <Pencil aria-hidden="true" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onTogglePin(application)}>
          {application.pinned ? (
            <>
              <PinOff aria-hidden="true" /> Unpin
            </>
          ) : (
            <>
              <Pin aria-hidden="true" /> Pin
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDelete(application)}
        >
          <Trash2 aria-hidden="true" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IOSInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = window.navigator as Navigator & {
      standalone?: boolean;
    };
    const isIOS = /iPad|iPhone|iPod/.test(navigatorWithStandalone.userAgent);
    const isStandalone =
      navigatorWithStandalone.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = window.localStorage.getItem(
      "jobtrack.install-hint-dismissed",
    );

    const frame = window.requestAnimationFrame(() => {
      setVisible(isIOS && !isStandalone && !dismissed);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!visible) return null;

  function dismiss() {
    window.localStorage.setItem("jobtrack.install-hint-dismissed", "true");
    setVisible(false);
  }

  return (
    <aside className="mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.07] px-4 py-3.5 text-sm shadow-[0_16px_40px_rgba(0,0,0,.14)]">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Smartphone className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">Install JobTrack on this iPhone</p>
        <p className="mt-1 leading-5 text-muted-foreground">
          In Safari, tap <Share2 className="mx-1 inline size-3.5" aria-label="Share" />
          then <span className="text-foreground">Add to Home Screen</span>.
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={dismiss}
        aria-label="Dismiss install instructions"
      >
        <X aria-hidden="true" />
      </Button>
    </aside>
  );
}

function ExportCsvDialog({
  open,
  onOpenChange,
  applications,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: Application[];
}) {
  const [selectedColumns, setSelectedColumns] = useState<Set<CsvColumnKey>>(
    () => new Set(csvColumns.map((column) => column.key)),
  );

  const allSelected = selectedColumns.size === csvColumns.length;
  const canExport = applications.length > 0 && selectedColumns.size > 0;

  function toggleColumn(key: CsvColumnKey) {
    setSelectedColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllColumns() {
    setSelectedColumns(new Set(csvColumns.map((column) => column.key)));
  }

  function exportCsv() {
    if (!canExport) return;

    downloadApplicationsCsv(applications, selectedColumns);
    toast.success(
      `${applications.length} application${applications.length === 1 ? "" : "s"} exported`,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#0c1722] p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-white/[0.07] px-6 py-5">
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Download className="size-4" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl tracking-[-0.025em]">
            Export applications
          </DialogTitle>
          <DialogDescription>
            Choose the columns to include. This exports the {applications.length}{" "}
            application{applications.length === 1 ? "" : "s"} currently shown by
            your search and status filters.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">CSV columns</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedColumns.size} of {csvColumns.length} selected
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAllColumns}
                disabled={allSelected}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedColumns(new Set())}
                disabled={selectedColumns.size === 0}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {csvColumns.map((column) => (
              <label
                key={column.key}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-sm transition-colors hover:border-white/[0.13] hover:bg-white/[0.04]"
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.has(column.key)}
                  onChange={() => toggleColumn(column.key)}
                  className="size-4 shrink-0 accent-[#5ee3c2]"
                />
                <span className="text-foreground">{column.label}</span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t border-white/[0.07] px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={exportCsv} disabled={!canExport}>
            <Download aria-hidden="true" />
            Export {applications.length || ""} application
            {applications.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationDialog({
  open,
  onOpenChange,
  application,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onSave: (draft: ApplicationDraft, id?: string) => Promise<boolean>;
}) {
  const emptyDraft: ApplicationDraft = {
    company: "",
    role: "",
    stage: "Applied",
    outcome: "Active",
    companyStatus: "",
    appliedAt: todayInputValue(),
    responseAt: "",
    source: "",
    location: "",
    jobUrl: "",
    notes: "",
    interviewAt: "",
    interviewLink: "",
    interviewDetails: "",
    rejectedAt: "",
    hadAssessment: false,
  };

  const [draft, setDraft] = useState<ApplicationDraft>(() =>
    application
      ? {
          company: application.company,
          role: application.role,
          stage: application.stage,
          outcome: application.outcome,
          companyStatus: application.companyStatus,
          appliedAt: application.appliedAt,
          responseAt: application.responseAt,
          source: application.source,
          location: application.location,
          jobUrl: application.jobUrl,
          notes: application.notes,
          interviewAt: application.interviewAt,
          interviewLink: application.interviewLink,
          interviewDetails: application.interviewDetails,
          rejectedAt: application.rejectedAt,
          hadAssessment: application.hadAssessment,
        }
      : emptyDraft,
  );
  const [submitting, setSubmitting] = useState(false);
  const [showInterviewFields, setShowInterviewFields] = useState(
    Boolean(
      application?.interviewAt ||
        application?.interviewLink ||
        application?.interviewDetails,
    ),
  );

  function updateField<K extends keyof ApplicationDraft>(
    key: K,
    value: ApplicationDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleStageChange(stage: Stage) {
    setDraft((current) => ({
      ...current,
      stage,
      outcome: stage === "Offer" ? "Offer" : current.outcome,
      hadAssessment:
        stage === "Assessment"
          ? true
          : stage === "Applied"
            ? false
            : current.hadAssessment,
      responseAt:
        stage !== "Applied" && !current.responseAt
          ? todayInputValue()
          : current.responseAt,
    }));
  }

  function handleAssessmentChange(hadAssessment: boolean) {
    setDraft((current) => ({
      ...current,
      hadAssessment,
      stage:
        hadAssessment && current.stage === "Applied"
          ? "Assessment"
          : !hadAssessment && current.stage === "Assessment"
            ? "Applied"
            : current.stage,
      responseAt:
        hadAssessment && !current.responseAt
          ? todayInputValue()
          : !hadAssessment && current.stage === "Assessment"
            ? undefined
            : current.responseAt,
    }));
  }

  function handleOutcomeChange(outcome: Outcome) {
    setDraft((current) => ({
      ...current,
      outcome,
      stage: outcome === "Offer" ? "Offer" : current.stage,
      rejectedAt:
        outcome === "Rejected"
          ? current.rejectedAt || todayInputValue()
          : undefined,
      responseAt:
        (current.stage !== "Applied" || outcome === "Offer") &&
        !current.responseAt
          ? todayInputValue()
          : current.responseAt,
    }));
  }

  function removeInterviewSchedule() {
    setShowInterviewFields(false);
    setDraft((current) => ({
      ...current,
      interviewAt: undefined,
      interviewLink: undefined,
      interviewDetails: undefined,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.company.trim() || !draft.role.trim() || !draft.appliedAt) return;

    const hasPositiveResponse =
      draft.hadAssessment ||
      draft.stage !== "Applied" ||
      draft.outcome === "Offer";

    setSubmitting(true);
    const saved = await onSave(
      {
        ...draft,
        company: draft.company.trim(),
        role: draft.role.trim(),
        companyStatus: draft.companyStatus?.trim(),
        source: draft.source?.trim(),
        location: draft.location?.trim(),
        jobUrl: draft.jobUrl?.trim(),
        notes: draft.notes?.trim(),
        interviewAt: showInterviewFields ? draft.interviewAt : undefined,
        interviewLink: showInterviewFields
          ? draft.interviewLink?.trim()
          : undefined,
        interviewDetails: showInterviewFields
          ? draft.interviewDetails?.trim()
          : undefined,
        responseAt: hasPositiveResponse
          ? draft.responseAt || todayInputValue()
          : undefined,
        rejectedAt:
          draft.outcome === "Rejected"
            ? draft.rejectedAt || todayInputValue()
            : undefined,
      },
      application?.id,
    );
    setSubmitting(false);
    if (saved) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#0c1722] p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-white/[0.07] px-6 py-5">
          <DialogTitle className="text-xl tracking-[-0.025em]">
            {application ? "Edit application" : "New application"}
          </DialogTitle>
          <DialogDescription>
            Stage tracks how far you got; result tracks where it stands now.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={draft.company}
                onChange={(event) => updateField("company", event.target.value)}
                placeholder="Company name"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={draft.role}
                onChange={(event) => updateField("role", event.target.value)}
                placeholder="Machine Learning Engineer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Highest stage reached</Label>
              <NativeSelect
                id="stage"
                className="w-full"
                value={draft.stage}
                onChange={(event) => handleStageChange(event.target.value as Stage)}
              >
                {stages.map((stage) => (
                  <NativeSelectOption key={stage} value={stage}>
                    {stage}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outcome">Current result</Label>
              <NativeSelect
                id="outcome"
                className="w-full"
                value={draft.outcome}
                onChange={(event) =>
                  handleOutcomeChange(event.target.value as Outcome)
                }
              >
                {outcomes.map((outcome) => (
                  <NativeSelectOption key={outcome} value={outcome}>
                    {outcome}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="company-status">
                Company status <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="company-status"
                value={draft.companyStatus ?? ""}
                onChange={(event) =>
                  updateField("companyStatus", event.target.value)
                }
                placeholder="Submitted, Resume Screening, Under Review…"
                maxLength={200}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Use the company&apos;s exact wording. This is free text, so you can
                enter any label shown in its portal or emails.
              </p>
            </div>
            <div className="flex items-center justify-between gap-5 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 sm:col-span-2">
              <div className="min-w-0">
                <Label htmlFor="had-assessment">
                  Assessment in this process
                </Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Turn this on for an online assessment, take-home, or technical
                  test—even if you later reached an interview.
                </p>
              </div>
              <Switch
                id="had-assessment"
                checked={draft.hadAssessment}
                onCheckedChange={handleAssessmentChange}
                aria-label="This application process included an assessment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applied-date">Applied date</Label>
              <Input
                id="applied-date"
                type="date"
                value={draft.appliedAt}
                onChange={(event) => updateField("appliedAt", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response-date">First positive response date</Label>
              <Input
                id="response-date"
                type="date"
                value={draft.responseAt ?? ""}
                onChange={(event) => updateField("responseAt", event.target.value)}
              />
            </div>
            {draft.outcome === "Rejected" && (
              <div className="space-y-2">
                <Label htmlFor="rejection-date">Rejection date</Label>
                <Input
                  id="rejection-date"
                  type="date"
                  value={draft.rejectedAt ?? ""}
                  onChange={(event) =>
                    updateField("rejectedAt", event.target.value)
                  }
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={draft.source ?? ""}
                onChange={(event) => updateField("source", event.target.value)}
                placeholder="LinkedIn, referral, company site…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={draft.location ?? ""}
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="Chicago, IL or Remote"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="job-url">Job link</Label>
              <Input
                id="job-url"
                type="url"
                value={draft.jobUrl ?? ""}
                onChange={(event) => updateField("jobUrl", event.target.value)}
                placeholder="https://…"
              />
            </div>
            <section className="sm:col-span-2 rounded-xl border border-[#ffb562]/20 bg-[#ffb562]/[0.045] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ffb562]/10 text-[#ffca8d]">
                    <CalendarClock className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      Interview schedule
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      Save the next interview and everything needed to join it.
                    </p>
                  </div>
                </div>
                {showInterviewFields ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={removeInterviewSchedule}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInterviewFields(true)}
                  >
                    Add interview
                  </Button>
                )}
              </div>

              {showInterviewFields && (
                <div className="mt-5 grid gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="interview-date">Date and time</Label>
                    <Input
                      id="interview-date"
                      type="datetime-local"
                      value={toDateTimeInputValue(draft.interviewAt)}
                      onChange={(event) =>
                        updateField(
                          "interviewAt",
                          fromDateTimeInputValue(event.target.value),
                        )
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interview-link">Meeting link</Label>
                    <Input
                      id="interview-link"
                      type="url"
                      value={draft.interviewLink ?? ""}
                      onChange={(event) =>
                        updateField("interviewLink", event.target.value)
                      }
                      placeholder="Zoom, Teams, or Google Meet link"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="interview-details">Interview details</Label>
                    <Textarea
                      id="interview-details"
                      value={draft.interviewDetails ?? ""}
                      onChange={(event) =>
                        updateField("interviewDetails", event.target.value)
                      }
                      placeholder="Interviewers, format, topics to prepare, or special instructions…"
                      className="min-h-24 resize-y"
                      maxLength={5000}
                    />
                  </div>
                </div>
              )}
            </section>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={draft.notes ?? ""}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Recruiter name, next steps, salary range, or anything worth remembering…"
                className="min-h-28 resize-y"
                maxLength={5000}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-white/[0.07] px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Check aria-hidden="true" />
              )}
              {application ? "Save changes" : "Add application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Dashboard({
  supabase,
  user,
  onSignOut,
}: {
  supabase: SupabaseClient;
  user: User;
  onSignOut: () => Promise<void>;
}) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [momentumRange, setMomentumRange] =
    useState<MomentumRange>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingApplication, setEditingApplication] =
    useState<Application | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      setDataLoading(true);
      setDataError(null);

      try {
        const migrationKey = `jobtrack.local-migrated.${user.id}`;
        const migrationComplete = window.localStorage.getItem(migrationKey);

        if (!migrationComplete) {
          const saved = window.localStorage.getItem(storageKey);
          let storedApplications: Application[] = [];

          if (saved) {
            try {
              const parsed: unknown = JSON.parse(saved);
              storedApplications = Array.isArray(parsed)
                ? parsed
                    .filter(isStoredApplication)
                    .map(normalizeStoredApplication)
                : [];
            } catch {
              // Ignore malformed legacy browser data and continue with Supabase.
            }
          }
          const applicationsToImport = storedApplications.filter(
            (application) => !application.id.startsWith("demo-"),
          );

          if (applicationsToImport.length > 0) {
            const { error: importError } = await supabase
              .from("applications")
              .upsert(
                applicationsToImport.map((application) => ({
                  user_id: user.id,
                  legacy_id: application.id,
                  ...databaseFields(application),
                })),
                {
                  onConflict: "user_id,legacy_id",
                  ignoreDuplicates: true,
                },
              );

            if (importError) throw importError;
            toast.success(
              `${applicationsToImport.length} saved application${applicationsToImport.length === 1 ? "" : "s"} imported`,
            );
          }

          window.localStorage.setItem(migrationKey, "true");
        }

        const { data, error } = await supabase
          .from("applications")
          .select(applicationColumns)
          .order("applied_at", { ascending: false });

        if (error) throw error;
        if (!cancelled) {
          setApplications(
            ((data ?? []) as ApplicationRow[]).map(applicationFromRow),
          );
        }
      } catch (caughtError) {
        if (!cancelled) {
          setDataError(
            errorMessage(
              caughtError,
              "Your applications could not be loaded.",
            ),
          );
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    void loadApplications();
    return () => {
      cancelled = true;
    };
  }, [reloadToken, supabase, user.id]);

  const metrics = useMemo(() => {
    const positiveResponses = applications.filter(
      (application) =>
        application.hadAssessment ||
        application.stage !== "Applied" ||
        application.outcome === "Offer",
    ).length;
    const assessments = applications.filter(
      (application) =>
        application.hadAssessment || application.stage === "Assessment",
    ).length;
    const interviewApplications = applications.filter(
      (application) =>
        stageRank[application.stage] >= stageRank["Interview 1"],
    );
    const interviews = interviewApplications.length;
    const assessmentInterviews = interviewApplications.filter(
      (application) => application.hadAssessment,
    ).length;
    const directInterviews = interviews - assessmentInterviews;
    const offers = applications.filter(
      (application) =>
        application.stage === "Offer" || application.outcome === "Offer",
    ).length;
    const rejected = applications.filter(
      (application) => application.outcome === "Rejected",
    ).length;
    const active = applications.filter(
      (application) => application.outcome === "Active",
    ).length;
    const withdrawn = applications.filter(
      (application) => application.outcome === "Withdrawn",
    ).length;

    return {
      total: applications.length,
      positiveResponses,
      assessments,
      interviews,
      assessmentInterviews,
      directInterviews,
      offers,
      rejected,
      active,
      withdrawn,
      positiveResponseRate: applications.length
        ? Math.round((positiveResponses / applications.length) * 100)
        : 0,
      rejectionRate: applications.length
        ? Math.round((rejected / applications.length) * 100)
        : 0,
      interviewRate: applications.length
        ? Math.round((interviews / applications.length) * 100)
        : 0,
      offerRate: applications.length
        ? Math.round((offers / applications.length) * 100)
        : 0,
    };
  }, [applications]);

  const momentumSeries = useMemo(
    () => buildMomentumSeries(applications, momentumRange),
    [applications, momentumRange],
  );

  const outcomeData = useMemo(
    () =>
      [
        { name: "Active" as Outcome, value: metrics.active },
        { name: "Rejected" as Outcome, value: metrics.rejected },
        { name: "Offer" as Outcome, value: metrics.offers },
        { name: "Withdrawn" as Outcome, value: metrics.withdrawn },
      ].filter((item) => item.value > 0),
    [metrics],
  );

  const filteredApplications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...applications]
      .filter((application) => {
        const matchesSearch =
          !normalizedSearch ||
          [
            application.company,
            application.role,
            application.companyStatus,
            application.location,
            application.source,
            application.notes,
            application.interviewDetails,
          ]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalizedSearch));

        const visibleStatus =
          application.outcome === "Active"
            ? application.stage
            : application.outcome;
        const matchesStatus =
          statusFilter === "All" ||
          statusFilter === visibleStatus ||
          (statusFilter === "Active" && application.outcome === "Active");

        return matchesSearch && matchesStatus;
      })
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          parseLocalDate(b.appliedAt).getTime() -
            parseLocalDate(a.appliedAt).getTime(),
      );
  }, [applications, search, statusFilter]);

  function openNewApplication() {
    setEditingApplication(null);
    setDialogOpen(true);
  }

  function openEditApplication(application: Application) {
    setEditingApplication(application);
    setDialogOpen(true);
  }

  async function saveApplication(
    draft: ApplicationDraft,
    id?: string,
  ): Promise<boolean> {
    try {
      if (id) {
        const { data, error } = await supabase
          .from("applications")
          .update(databaseFields(draft))
          .eq("id", id)
          .select(applicationColumns)
          .single();

        if (error) throw error;
        const updatedApplication = applicationFromRow(data as ApplicationRow);
        setApplications((current) =>
          current.map((application) =>
            application.id === id ? updatedApplication : application,
          ),
        );
        toast.success("Application updated");
        return true;
      }

      const { data, error } = await supabase
        .from("applications")
        .insert({ user_id: user.id, ...databaseFields(draft) })
        .select(applicationColumns)
        .single();

      if (error) throw error;
      setApplications((current) => [
        applicationFromRow(data as ApplicationRow),
        ...current,
      ]);
      toast.success("Application added");
      return true;
    } catch (caughtError) {
      toast.error("Application could not be saved", {
        description: errorMessage(caughtError, "Please try again."),
      });
      return false;
    }
  }

  async function importApplications(
    drafts: ApplicationDraft[],
  ): Promise<boolean> {
    const imported: Application[] = [];

    try {
      for (let start = 0; start < drafts.length; start += 200) {
        const { data, error } = await supabase
          .from("applications")
          .insert(
            drafts
              .slice(start, start + 200)
              .map((draft) => ({ user_id: user.id, ...databaseFields(draft) })),
          )
          .select(applicationColumns);

        if (error) throw error;
        imported.push(...((data ?? []) as ApplicationRow[]).map(applicationFromRow));
      }

      toast.success(
        `${imported.length} application${imported.length === 1 ? "" : "s"} imported`,
      );
      return true;
    } catch (caughtError) {
      toast.error(
        imported.length
          ? `Import stopped after ${imported.length} of ${drafts.length} applications`
          : "Applications could not be imported",
        { description: errorMessage(caughtError, "Please try again.") },
      );
      return false;
    } finally {
      if (imported.length) {
        setApplications((current) => [...imported, ...current]);
      }
    }
  }

  async function restoreApplication(application: Application, index: number) {
    const { data, error } = await supabase
      .from("applications")
      .insert({
        id: application.id,
        user_id: user.id,
        ...databaseFields(application),
        pinned: application.pinned,
      })
      .select(applicationColumns)
      .single();

    if (error) {
      toast.error("Application could not be restored", {
        description: error.message,
      });
      return;
    }

    setApplications((current) => {
      const restored = [...current];
      restored.splice(
        Math.min(Math.max(index, 0), restored.length),
        0,
        applicationFromRow(data as ApplicationRow),
      );
      return restored;
    });
    toast.success("Application restored");
  }

  async function togglePinned(application: Application) {
    const pinned = !application.pinned;
    const setPinned = (value: boolean) =>
      setApplications((current) =>
        current.map((item) =>
          item.id === application.id ? { ...item, pinned: value } : item,
        ),
      );
    setPinned(pinned);

    const { error } = await supabase
      .from("applications")
      .update({ pinned })
      .eq("id", application.id);

    if (error) {
      setPinned(!pinned);
      toast.error(`Application could not be ${pinned ? "pinned" : "unpinned"}`, {
        description: error.message,
      });
    }
  }

  async function deleteApplication(application: Application) {
    const index = applications.findIndex((item) => item.id === application.id);
    setApplications((current) =>
      current.filter((item) => item.id !== application.id),
    );

    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", application.id);

    if (error) {
      setApplications((current) => {
        const restored = [...current];
        restored.splice(Math.max(index, 0), 0, application);
        return restored;
      });
      toast.error("Application could not be deleted", {
        description: error.message,
      });
      return;
    }

    toast("Application removed", {
      description: `${application.company} · ${application.role}`,
      action: {
        label: "Undo",
        onClick: () => {
          void restoreApplication(application, index);
        },
      },
    });
  }

  if (dataLoading) return <LoadingScreen />;

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#071019]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.75rem] max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 font-mono text-sm font-bold text-primary">
              JT
            </div>
            <div>
              <p className="text-base font-semibold tracking-[-0.025em]">JobTrack</p>
              <p className="text-xs text-muted-foreground">
                Your job search path starts here.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-52 truncate text-xs text-muted-foreground md:block">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void onSignOut()}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut aria-hidden="true" />
            </Button>
            <Button
              onClick={openNewApplication}
              className="shadow-[0_0_24px_rgba(94,227,194,0.12)]"
            >
              <Plus aria-hidden="true" />
              <span className="hidden sm:inline">Add application</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <CircleDot className="size-3.5" aria-hidden="true" />
              Search pulse
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Your application dashboard
            </h1>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
            {new Intl.DateTimeFormat("en-US", {
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </p>
        </section>

        <IOSInstallHint />

        {dataError && (
          <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 sm:flex-row sm:items-center">
            <p className="flex items-start gap-2 text-sm text-[#ffadb2]">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Could not load your applications. {dataError}
              </span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-[#ffadb2] hover:bg-destructive/10 hover:text-white sm:self-auto"
              onClick={() => setReloadToken((current) => current + 1)}
            >
              Try again
            </Button>
          </div>
        )}

        <section
          aria-label="Application metrics"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          <MetricCard
            label="Applications"
            value={metrics.total}
            detail={`${metrics.active} currently active`}
            icon={BriefcaseBusiness}
            accent="#5ee3c2"
            delay="0ms"
          />
          <MetricCard
            label="Positive response rate"
            value={`${metrics.positiveResponseRate}%`}
            detail={`${metrics.positiveResponses} advanced applications`}
            icon={TrendingUp}
            accent="#7aa7ff"
            delay="60ms"
          />
          <MetricCard
            label="Rejection rate"
            value={`${metrics.rejectionRate}%`}
            detail={`${metrics.rejected} total rejections`}
            icon={X}
            accent="#ff6b74"
            delay="120ms"
          />
          <MetricCard
            label="Interviews"
            value={metrics.interviews}
            detail={`${metrics.interviewRate}% of applications`}
            icon={Target}
            accent="#ffb562"
            delay="180ms"
          />
          <MetricCard
            label="Offers"
            value={metrics.offers}
            detail={`${metrics.offerRate}% of applications`}
            icon={Check}
            accent="#a998ff"
            delay="240ms"
          />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-12">
          <Card className="gap-0 border-white/[0.07] bg-card/85 py-0 xl:col-span-7">
            <CardHeader className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div>
                <CardTitle className="text-base tracking-[-0.02em]">
                  Search momentum
                </CardTitle>
                <CardDescription className="mt-1.5">
                  {momentumDescriptions[momentumRange]}
                </CardDescription>
              </div>
              <div
                className="flex w-fit items-center gap-1 rounded-lg border border-white/[0.08] bg-[#07131e] p-1"
                role="group"
                aria-label="Search momentum date range"
              >
                {momentumRanges.map((option) => {
                  const isSelected = momentumRange === option.value;

                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-pressed={isSelected}
                      onClick={() => setMomentumRange(option.value)}
                      className={
                        isSelected
                          ? "bg-primary/15 text-primary shadow-sm hover:bg-primary/20 hover:text-primary"
                          : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                      }
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-4 pt-5 sm:px-5">
              <ChartContainer
                config={activityConfig}
                className="h-[280px] w-full aspect-auto"
              >
                <AreaChart
                  accessibilityLayer
                  data={momentumSeries}
                  margin={{ top: 8, right: 12, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="applications-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5ee3c2" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#5ee3c2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="positive-responses-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#7aa7ff" stopOpacity={0.26} />
                      <stop offset="95%" stopColor="#7aa7ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="rejections-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#ff6b74" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#ff6b74" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={18}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={{ stroke: "rgba(143,163,182,.3)", strokeWidth: 1 }}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    stroke="#5ee3c2"
                    strokeWidth={2.25}
                    fill="url(#applications-fill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="positiveResponses"
                    stroke="#7aa7ff"
                    strokeWidth={2.25}
                    fill="url(#positive-responses-fill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="rejections"
                    stroke="#ff6b74"
                    strokeWidth={2.25}
                    fill="url(#rejections-fill)"
                  />
                </AreaChart>
              </ChartContainer>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-[#5ee3c2]" /> Applications
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-[#7aa7ff]" /> Positive responses
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-[#ff6b74]" /> Rejections
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 border-white/[0.07] bg-card/85 py-0 xl:col-span-5">
            <CardHeader className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
              <CardTitle className="text-base tracking-[-0.02em]">
                Current outcomes
              </CardTitle>
              <CardDescription>Where every application stands right now</CardDescription>
            </CardHeader>
            <CardContent className="grid min-h-[344px] items-center gap-3 px-5 py-5 sm:grid-cols-[1.15fr_.85fr] sm:px-6">
              <div className="relative mx-auto h-[230px] w-full max-w-[260px]">
                {outcomeData.length ? (
                  <ChartContainer
                    config={{}}
                    className="h-full w-full aspect-auto"
                  >
                    <PieChart accessibilityLayer>
                      <ChartTooltip
                        content={<ChartTooltipContent hideLabel nameKey="name" />}
                      />
                      <Pie
                        data={outcomeData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={65}
                        outerRadius={92}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {outcomeData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={outcomeColors[entry.name]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="absolute inset-5 rounded-full border-[26px] border-white/[0.04]" />
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-semibold tracking-[-0.04em]">
                    {metrics.total}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">total</span>
                </div>
              </div>
              <div className="space-y-3">
                {(["Active", "Rejected", "Offer", "Withdrawn"] as Outcome[]).map(
                  (outcome) => {
                    const value =
                      outcome === "Active"
                        ? metrics.active
                        : outcome === "Rejected"
                          ? metrics.rejected
                          : outcome === "Offer"
                            ? metrics.offers
                            : metrics.withdrawn;
                    return (
                      <div key={outcome} className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span
                            className="size-2 rounded-sm"
                            style={{ backgroundColor: outcomeColors[outcome] }}
                          />
                          {outcome}
                        </span>
                        <span className="font-mono text-sm font-medium">{value}</span>
                      </div>
                    );
                  },
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="mt-4 gap-0 overflow-hidden border-white/[0.07] bg-card/85 py-0">
          <CardHeader className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
            <CardTitle className="text-base tracking-[-0.02em]">
              How your applications flow
            </CardTitle>
            <CardDescription>
              Applications can move directly to interviews or through an assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-6 sm:px-6">
            <ApplicationFlow
              total={metrics.total}
              assessments={metrics.assessments}
              interviews={metrics.interviews}
              directInterviews={metrics.directInterviews}
              assessmentInterviews={metrics.assessmentInterviews}
              offers={metrics.offers}
              rejected={metrics.rejected}
            />
          </CardContent>
        </Card>

        <Card className="mt-4 gap-0 overflow-hidden border-white/[0.07] bg-card/85 py-0">
          <CardHeader className="gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto]">
            <div>
              <CardTitle className="text-base tracking-[-0.02em]">
                Applications
              </CardTitle>
              <CardDescription className="mt-1.5">
                {filteredApplications.length} of {applications.length} shown
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload aria-hidden="true" />
                Import
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExportDialogOpen(true)}
                disabled={filteredApplications.length === 0}
              >
                <Download aria-hidden="true" />
                Export CSV
              </Button>
              <div className="relative min-w-0 sm:w-64">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Search company or role"
                  aria-label="Search applications"
                />
              </div>
              <NativeSelect
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full sm:w-44"
                aria-label="Filter by status"
              >
                <NativeSelectOption value="All">All statuses</NativeSelectOption>
                <NativeSelectOption value="Active">Active</NativeSelectOption>
                {stages.map((stage) => (
                  <NativeSelectOption key={stage} value={stage}>
                    {stage}
                  </NativeSelectOption>
                ))}
                <NativeSelectOption value="Rejected">Rejected</NativeSelectOption>
                <NativeSelectOption value="Withdrawn">Withdrawn</NativeSelectOption>
              </NativeSelect>
            </div>
          </CardHeader>

          {applications.length === 0 ? (
            <EmptyApplications onAdd={openNewApplication} />
          ) : filteredApplications.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
              <Search className="size-6 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">No matching applications</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search or status.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-white/[0.055] md:hidden">
                {filteredApplications.map((application) => (
                  <article
                    key={application.id}
                    className="px-4 py-5 transition-colors active:bg-white/[0.025]"
                  >
                    <div className="flex items-start gap-3">
                      <CompanyAvatar
                        key={`mobile-${application.id}-${application.jobUrl ?? ""}`}
                        company={application.company}
                        jobUrl={application.jobUrl}
                        className="size-10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {application.pinned && <PinnedIndicator />}
                              <h3 className="truncate font-medium text-foreground">
                                {application.company}
                              </h3>
                              {application.jobUrl && (
                                <a
                                  href={application.jobUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                                  aria-label={`Open ${application.company} job posting`}
                                >
                                  <ExternalLink className="size-3.5" />
                                </a>
                              )}
                            </div>
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {application.role}
                            </p>
                          </div>
                          <ApplicationActions
                            application={application}
                            onEdit={openEditApplication}
                            onTogglePin={togglePinned}
                            onDelete={deleteApplication}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={stageBadgeClass(application.stage)}
                          >
                            {application.stage}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={outcomeBadgeClass(application.outcome)}
                          >
                            {application.outcome}
                          </Badge>
                        </div>

                        {application.companyStatus && (
                          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#7aa7ff]/20 bg-[#7aa7ff]/[0.055] px-3 py-2.5">
                            <CircleDot
                              className="mt-0.5 size-3.5 shrink-0 text-[#7aa7ff]"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#71869b]">
                                Company status
                              </p>
                              <p className="mt-0.5 break-words text-sm text-[#b8caff]">
                                {application.companyStatus}
                              </p>
                            </div>
                          </div>
                        )}

                        {application.interviewAt && (
                          <div className="mt-4 rounded-lg border border-[#ffb562]/20 bg-[#ffb562]/[0.055] px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="flex min-w-0 items-start gap-2 text-sm font-medium text-[#ffd09a]">
                                <CalendarClock
                                  className="mt-0.5 size-4 shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{formatDateTime(application.interviewAt)}</span>
                              </p>
                              {application.interviewLink && (
                                <a
                                  href={application.interviewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                                >
                                  <Link2 className="size-3.5" aria-hidden="true" />
                                  Join
                                </a>
                              )}
                            </div>
                            {application.interviewDetails && (
                              <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                                {application.interviewDetails}
                              </p>
                            )}
                          </div>
                        )}

                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                          <div>
                            <dt className="text-muted-foreground">Applied</dt>
                            <dd className="mt-1 font-mono text-[#b5c4d0]">
                              {formatDate(application.appliedAt)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Response</dt>
                            <dd className="mt-1 font-mono text-[#b5c4d0]">
                              {formatDate(application.responseAt)}
                            </dd>
                          </div>
                          {(application.location || application.source) && (
                            <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                              {application.location && <span>{application.location}</span>}
                              {application.source && <span>Via {application.source}</span>}
                            </div>
                          )}
                        </dl>

                        {application.notes && (
                          <p className="mt-4 line-clamp-3 rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2.5 text-sm leading-5 text-[#8fa3b6]">
                            {application.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
              <TableHeader>
                <TableRow className="border-white/[0.07] hover:bg-transparent">
                  <TableHead className="h-11 min-w-72 px-5 text-xs uppercase tracking-[0.1em] text-muted-foreground sm:px-6">
                    Company & role
                  </TableHead>
                  <TableHead className="h-11 min-w-40 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Stage
                  </TableHead>
                  <TableHead className="h-11 min-w-28 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Result
                  </TableHead>
                  <TableHead className="h-11 min-w-32 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Applied
                  </TableHead>
                  <TableHead className="h-11 min-w-32 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Response
                  </TableHead>
                  <TableHead className="h-11 min-w-32 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Source
                  </TableHead>
                  <TableHead className="h-11 w-14 px-5 text-right text-xs uppercase tracking-[0.1em] text-muted-foreground sm:px-6">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((application) => (
                  <TableRow
                    key={application.id}
                    className="border-white/[0.055] hover:bg-white/[0.025]"
                  >
                    <TableCell className="px-5 py-4 sm:px-6">
                      <div className="flex items-start gap-3">
                        <CompanyAvatar
                          key={`desktop-${application.id}-${application.jobUrl ?? ""}`}
                          company={application.company}
                          jobUrl={application.jobUrl}
                          className="mt-0.5 size-9 rounded-lg"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {application.pinned && <PinnedIndicator />}
                            <p className="truncate font-medium text-foreground">
                              {application.company}
                            </p>
                            {application.jobUrl && (
                              <a
                                href={application.jobUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground transition-colors hover:text-primary"
                                aria-label={`Open ${application.company} job posting`}
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {application.role}
                            {application.location ? ` · ${application.location}` : ""}
                          </p>
                          {application.companyStatus && (
                            <div
                              className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-[#7aa7ff]/20 bg-[#7aa7ff]/[0.055] px-2 py-1 text-xs text-[#b8caff]"
                              title={`Company status: ${application.companyStatus}`}
                            >
                              <CircleDot
                                className="size-3 shrink-0 text-[#7aa7ff]"
                                aria-hidden="true"
                              />
                              <span className="truncate">
                                Company status: {application.companyStatus}
                              </span>
                            </div>
                          )}
                          {application.interviewAt && (
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#d9ad76]">
                              <span className="flex items-center gap-1.5">
                                <CalendarClock className="size-3.5" aria-hidden="true" />
                                {formatDateTime(application.interviewAt)}
                              </span>
                              {application.interviewLink && (
                                <a
                                  href={application.interviewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 font-medium text-primary hover:underline"
                                >
                                  <Link2 className="size-3" aria-hidden="true" />
                                  Join
                                </a>
                              )}
                            </div>
                          )}
                          {application.notes && (
                            <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-5 text-[#7f93a6]">
                              {application.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={stageBadgeClass(application.stage)}
                      >
                        {application.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={outcomeBadgeClass(application.outcome)}
                      >
                        {application.outcome}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#9aabba]">
                      {formatDate(application.appliedAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#9aabba]">
                      {formatDate(application.responseAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {application.source || "—"}
                    </TableCell>
                    <TableCell className="px-5 text-right sm:px-6">
                      <ApplicationActions
                        application={application}
                        onEdit={openEditApplication}
                        onTogglePin={togglePinned}
                        onDelete={deleteApplication}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>

        <footer className="flex items-center justify-between px-1 pb-3 pt-7 text-xs text-[#5e7388]">
          <span>JobTrack</span>
          <span className="flex items-center gap-1.5">
            <Cloud className="size-3.5" aria-hidden="true" />
            Synced securely with Supabase
          </span>
        </footer>
      </main>

      <ApplicationDialog
        key={`${dialogOpen}-${editingApplication?.id ?? "new"}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={editingApplication}
        onSave={saveApplication}
      />
      <ExportCsvDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        applications={filteredApplications}
      />
      <ImportCsvDialog
        key={`import-${importDialogOpen}`}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        existingApplications={applications}
        onImport={importApplications}
      />
    </div>
  );
}

export default function Home() {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (event === "SIGNED_OUT") setPasswordRecovery(false);
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  let content;
  if (!isSupabaseConfigured || !supabase) {
    content = <SetupScreen />;
  } else if (!authReady) {
    content = <LoadingScreen />;
  } else if (passwordRecovery && session) {
    content = (
      <PasswordRecoveryScreen
        supabase={supabase}
        onComplete={() => setPasswordRecovery(false)}
      />
    );
  } else if (!session) {
    content = <AuthScreen supabase={supabase} />;
  } else {
    content = (
      <Dashboard
        supabase={supabase}
        user={session.user}
        onSignOut={async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            toast.error("Could not sign out", { description: error.message });
          }
        }}
      />
    );
  }

  return (
    <>
      {content}
      <Toaster position="bottom-right" richColors />
    </>
  );
}
