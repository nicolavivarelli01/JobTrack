"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleDot,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
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
import { Toaster } from "@/components/ui/sonner";

const stages = [
  "Applied",
  "Assessment",
  "Recruiter screen",
  "Interview",
  "Offer",
] as const;

const outcomes = ["Active", "Rejected", "Offer", "Withdrawn"] as const;

type Stage = (typeof stages)[number];
type Outcome = (typeof outcomes)[number];

type Application = {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  outcome: Outcome;
  appliedAt: string;
  responseAt?: string;
  source?: string;
  location?: string;
  jobUrl?: string;
};

type ApplicationDraft = Omit<Application, "id">;

const storageKey = "jobtrack.applications.v1";

const seedApplications: Application[] = [
  {
    id: "demo-1",
    company: "Northstar Health",
    role: "Machine Learning Engineer",
    stage: "Interview",
    outcome: "Active",
    appliedAt: "2026-08-04",
    responseAt: "2026-08-09",
    source: "Company site",
    location: "Chicago, IL",
  },
  {
    id: "demo-2",
    company: "Helix AI",
    role: "Applied AI Engineer",
    stage: "Assessment",
    outcome: "Active",
    appliedAt: "2026-08-10",
    responseAt: "2026-08-13",
    source: "LinkedIn",
    location: "Remote",
  },
  {
    id: "demo-3",
    company: "Atlas Care",
    role: "Data Scientist",
    stage: "Applied",
    outcome: "Rejected",
    appliedAt: "2026-08-11",
    responseAt: "2026-08-19",
    source: "Handshake",
    location: "Boston, MA",
  },
  {
    id: "demo-4",
    company: "Layer Systems",
    role: "NLP Engineer",
    stage: "Recruiter screen",
    outcome: "Rejected",
    appliedAt: "2026-08-15",
    responseAt: "2026-08-21",
    source: "Referral",
    location: "New York, NY",
  },
  {
    id: "demo-5",
    company: "Mosaic Health",
    role: "Machine Learning Scientist",
    stage: "Applied",
    outcome: "Active",
    appliedAt: "2026-08-18",
    source: "Company site",
    location: "Remote",
  },
  {
    id: "demo-6",
    company: "Cobalt Labs",
    role: "Software Engineer, AI",
    stage: "Assessment",
    outcome: "Rejected",
    appliedAt: "2026-08-21",
    responseAt: "2026-08-25",
    source: "LinkedIn",
    location: "Seattle, WA",
  },
  {
    id: "demo-7",
    company: "Orbit Bio",
    role: "Research Engineer",
    stage: "Recruiter screen",
    outcome: "Active",
    appliedAt: "2026-08-24",
    responseAt: "2026-08-30",
    source: "University network",
    location: "San Francisco, CA",
  },
  {
    id: "demo-8",
    company: "Juniper Data",
    role: "AI Platform Engineer",
    stage: "Applied",
    outcome: "Active",
    appliedAt: "2026-08-26",
    source: "Company site",
    location: "Austin, TX",
  },
  {
    id: "demo-9",
    company: "Signal Works",
    role: "ML Infrastructure Engineer",
    stage: "Interview",
    outcome: "Rejected",
    appliedAt: "2026-08-28",
    responseAt: "2026-08-31",
    source: "Referral",
    location: "Remote",
  },
  {
    id: "demo-10",
    company: "Veridian",
    role: "Applied Scientist",
    stage: "Offer",
    outcome: "Offer",
    appliedAt: "2026-08-29",
    responseAt: "2026-09-01",
    source: "LinkedIn",
    location: "Chicago, IL",
  },
  {
    id: "demo-11",
    company: "Kite Systems",
    role: "Backend Engineer, ML",
    stage: "Applied",
    outcome: "Active",
    appliedAt: "2026-09-01",
    source: "Company site",
    location: "Remote",
  },
  {
    id: "demo-12",
    company: "Mercury AI",
    role: "Machine Learning Engineer",
    stage: "Applied",
    outcome: "Active",
    appliedAt: "2026-09-03",
    source: "LinkedIn",
    location: "New York, NY",
  },
];

const activityConfig = {
  applications: {
    label: "Applications",
    color: "#5ee3c2",
  },
  responses: {
    label: "Responses",
    color: "#7aa7ff",
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
  Interview: 3,
  Offer: 4,
};

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

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const difference = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + difference);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildWeeklySeries(applications: Application[]) {
  const currentWeek = startOfWeek(new Date());

  return Array.from({ length: 8 }, (_, index) => {
    const start = new Date(currentWeek);
    start.setDate(currentWeek.getDate() - (7 - index) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const isInWeek = (value?: string) => {
      if (!value) return false;
      const date = parseLocalDate(value);
      return date >= start && date < end;
    };

    return {
      week: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(start),
      applications: applications.filter((item) => isInWeek(item.appliedAt))
        .length,
      responses: applications.filter((item) => isInWeek(item.responseAt))
        .length,
    };
  });
}

function stageBadgeClass(stage: Stage) {
  switch (stage) {
    case "Assessment":
      return "border-[#7aa7ff]/30 bg-[#7aa7ff]/10 text-[#a8c4ff]";
    case "Recruiter screen":
      return "border-[#a998ff]/30 bg-[#a998ff]/10 text-[#c9bdff]";
    case "Interview":
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
}: {
  label: string;
  value: number;
  percentage: number;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-[#ff6b74]/25 bg-[#ff6b74]/8"
      : tone === "success"
        ? "border-[#5ee3c2]/25 bg-[#5ee3c2]/8"
        : "border-white/[0.08] bg-white/[0.025]";

  return (
    <div className={`min-w-40 rounded-xl border px-4 py-4 ${toneClass}`}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <span className="text-2xl font-semibold tracking-[-0.04em]">{value}</span>
        <span className="font-mono text-xs text-[#71869b]">{percentage}%</span>
      </div>
    </div>
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

function ApplicationDialog({
  open,
  onOpenChange,
  application,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onSave: (draft: ApplicationDraft, id?: string) => void;
}) {
  const emptyDraft: ApplicationDraft = {
    company: "",
    role: "",
    stage: "Applied",
    outcome: "Active",
    appliedAt: todayInputValue(),
    responseAt: "",
    source: "",
    location: "",
    jobUrl: "",
  };

  const [draft, setDraft] = useState<ApplicationDraft>(emptyDraft);

  useEffect(() => {
    if (!open) return;
    setDraft(application ? { ...application } : emptyDraft);
    // The dialog should reset only when it opens or the selected row changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, application]);

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
      responseAt:
        stage !== "Applied" && !current.responseAt
          ? todayInputValue()
          : current.responseAt,
    }));
  }

  function handleOutcomeChange(outcome: Outcome) {
    setDraft((current) => ({
      ...current,
      outcome,
      stage: outcome === "Offer" ? "Offer" : current.stage,
      responseAt:
        outcome !== "Active" && outcome !== "Withdrawn" && !current.responseAt
          ? todayInputValue()
          : current.responseAt,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.company.trim() || !draft.role.trim() || !draft.appliedAt) return;

    const hasResponse =
      draft.stage !== "Applied" ||
      draft.outcome === "Rejected" ||
      draft.outcome === "Offer";

    onSave(
      {
        ...draft,
        company: draft.company.trim(),
        role: draft.role.trim(),
        source: draft.source?.trim(),
        location: draft.location?.trim(),
        jobUrl: draft.jobUrl?.trim(),
        responseAt: hasResponse
          ? draft.responseAt || todayInputValue()
          : undefined,
      },
      application?.id,
    );
    onOpenChange(false);
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
              <Label htmlFor="response-date">First response date</Label>
              <Input
                id="response-date"
                type="date"
                value={draft.responseAt ?? ""}
                onChange={(event) => updateField("responseAt", event.target.value)}
              />
            </div>
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
          </div>

          <DialogFooter className="border-t border-white/[0.07] px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Check aria-hidden="true" />
              {application ? "Save changes" : "Add application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const [applications, setApplications] =
    useState<Application[]>(seedApplications);
  const [storageReady, setStorageReady] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApplication, setEditingApplication] =
    useState<Application | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setApplications(JSON.parse(saved) as Application[]);
    } catch {
      toast.error("Saved applications could not be loaded.");
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(storageKey, JSON.stringify(applications));
  }, [applications, storageReady]);

  const isDemoData =
    applications.length > 0 &&
    applications.every((application) => application.id.startsWith("demo-"));

  const metrics = useMemo(() => {
    const responses = applications.filter(
      (application) =>
        application.stage !== "Applied" ||
        application.outcome === "Rejected" ||
        application.outcome === "Offer",
    ).length;
    const interviews = applications.filter(
      (application) => stageRank[application.stage] >= stageRank.Interview,
    ).length;
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
      responses,
      interviews,
      offers,
      rejected,
      active,
      withdrawn,
      responseRate: applications.length
        ? Math.round((responses / applications.length) * 100)
        : 0,
      interviewRate: applications.length
        ? Math.round((interviews / applications.length) * 100)
        : 0,
    };
  }, [applications]);

  const weeklySeries = useMemo(
    () => buildWeeklySeries(applications),
    [applications],
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
            application.location,
            application.source,
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

  function saveApplication(draft: ApplicationDraft, id?: string) {
    if (id) {
      setApplications((current) =>
        current.map((application) =>
          application.id === id ? { ...draft, id } : application,
        ),
      );
      toast.success("Application updated");
      return;
    }

    const newApplication: Application = {
      ...draft,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `application-${Date.now()}`,
    };

    setApplications((current) =>
      isDemoData ? [newApplication] : [newApplication, ...current],
    );
    toast.success(
      isDemoData ? "Sample data replaced" : "Application added",
    );
  }

  function deleteApplication(application: Application) {
    const index = applications.findIndex((item) => item.id === application.id);
    setApplications((current) =>
      current.filter((item) => item.id !== application.id),
    );
    toast("Application removed", {
      description: `${application.company} · ${application.role}`,
      action: {
        label: "Undo",
        onClick: () =>
          setApplications((current) => {
            const restored = [...current];
            restored.splice(Math.max(index, 0), 0, application);
            return restored;
          }),
      },
    });
  }

  const flowPercent = (value: number) =>
    metrics.total ? Math.round((value / metrics.total) * 100) : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/[0.07] bg-[#071019]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.75rem] max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 font-mono text-sm font-bold text-primary">
              JT
            </div>
            <div>
              <p className="text-base font-semibold tracking-[-0.025em]">JobTrack</p>
              <p className="text-xs text-muted-foreground">Nick&apos;s job search</p>
            </div>
          </div>
          <Button onClick={openNewApplication} className="shadow-[0_0_24px_rgba(94,227,194,0.12)]">
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">Add application</span>
            <span className="sm:hidden">Add</span>
          </Button>
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

        {isDemoData && (
          <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-[#7aa7ff]/20 bg-[#7aa7ff]/[0.07] px-4 py-3 sm:flex-row sm:items-center">
            <p className="text-sm text-[#b7cbff]">
              Sample data is showing so you can see the dashboard in action.
              Your first new entry will replace it.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-[#b7cbff] hover:bg-[#7aa7ff]/10 hover:text-white sm:self-auto"
              onClick={() => setApplications([])}
            >
              <X aria-hidden="true" />
              Start fresh
            </Button>
          </div>
        )}

        <section
          aria-label="Application metrics"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
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
            label="Response rate"
            value={`${metrics.responseRate}%`}
            detail={`${metrics.responses} employer responses`}
            icon={TrendingUp}
            accent="#7aa7ff"
            delay="60ms"
          />
          <MetricCard
            label="Interviews"
            value={metrics.interviews}
            detail={`${metrics.interviewRate}% of applications`}
            icon={Target}
            accent="#ffb562"
            delay="120ms"
          />
          <MetricCard
            label="Offers"
            value={metrics.offers}
            detail={`${metrics.rejected} rejections so far`}
            icon={Check}
            accent="#a998ff"
            delay="180ms"
          />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-12">
          <Card className="gap-0 border-white/[0.07] bg-card/85 py-0 xl:col-span-7">
            <CardHeader className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
              <CardTitle className="text-base tracking-[-0.02em]">
                Search momentum
              </CardTitle>
              <CardDescription>Applications sent and responses received by week</CardDescription>
            </CardHeader>
            <CardContent className="px-2 pb-4 pt-5 sm:px-5">
              <ChartContainer
                config={activityConfig}
                className="h-[280px] w-full aspect-auto"
              >
                <AreaChart
                  accessibilityLayer
                  data={weeklySeries}
                  margin={{ top: 8, right: 12, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="applications-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5ee3c2" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#5ee3c2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="responses-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7aa7ff" stopOpacity={0.26} />
                      <stop offset="95%" stopColor="#7aa7ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
                  <XAxis
                    dataKey="week"
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
                    dataKey="responses"
                    stroke="#7aa7ff"
                    strokeWidth={2.25}
                    fill="url(#responses-fill)"
                  />
                </AreaChart>
              </ChartContainer>
              <div className="flex items-center justify-center gap-5 pb-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-[#5ee3c2]" /> Applications
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-[#7aa7ff]" /> Responses
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
              Application flow
            </CardTitle>
            <CardDescription>
              Conversion from submitted applications to offers
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-5 py-6 sm:px-6">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-3">
                <FlowNode
                  label="Applications"
                  value={metrics.total}
                  percentage={100}
                />
                <ArrowRight className="size-4 text-[#496078]" aria-hidden="true" />
                <FlowNode
                  label="Responses"
                  value={metrics.responses}
                  percentage={flowPercent(metrics.responses)}
                />
                <ArrowRight className="size-4 text-[#496078]" aria-hidden="true" />
                <FlowNode
                  label="Interviews"
                  value={metrics.interviews}
                  percentage={flowPercent(metrics.interviews)}
                />
                <ArrowRight className="size-4 text-[#496078]" aria-hidden="true" />
                <FlowNode
                  label="Offers"
                  value={metrics.offers}
                  percentage={flowPercent(metrics.offers)}
                  tone="success"
                />
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-3">
                <div />
                <div />
                <div className="relative pt-6">
                  <div className="absolute left-1/2 top-0 h-5 w-px bg-[#ff6b74]/30" />
                  <FlowNode
                    label="Rejections"
                    value={metrics.rejected}
                    percentage={flowPercent(metrics.rejected)}
                    tone="danger"
                  />
                </div>
              </div>
            </div>
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
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-sm font-semibold text-[#b9c8d4]">
                          {application.company.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
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
                          <DropdownMenuItem
                            onSelect={() => openEditApplication(application)}
                          >
                            <Pencil aria-hidden="true" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => deleteApplication(application)}
                          >
                            <Trash2 aria-hidden="true" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <footer className="flex items-center justify-between px-1 pb-3 pt-7 text-xs text-[#5e7388]">
          <span>JobTrack</span>
          <span>Your data stays in this browser.</span>
        </footer>
      </main>

      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={editingApplication}
        onSave={saveApplication}
      />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
