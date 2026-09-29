import { ArrowDown } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ApplicationMetrics } from "@/lib/metrics";

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
        <span className="text-2xl font-semibold tracking-[-0.04em]">
          {value}
        </span>
        <span className="shrink-0 rounded-full border border-white/[0.06] bg-black/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#8ba0b4]">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

function FlowDiagram({ metrics }: { metrics: ApplicationMetrics }) {
  const {
    total,
    assessments,
    interviews,
    directInterviews,
    assessmentInterviews,
    offers,
    rejected,
  } = metrics;
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

export function ApplicationFlowCard({
  metrics,
}: {
  metrics: ApplicationMetrics;
}) {
  return (
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
        <FlowDiagram metrics={metrics} />
      </CardContent>
    </Card>
  );
}
