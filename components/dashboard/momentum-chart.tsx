"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import type { Application } from "@/lib/applications";
import {
  buildMomentumSeries,
  momentumRanges,
  type MomentumRange,
} from "@/lib/metrics";

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

const momentumDescriptions: Record<MomentumRange, string> = {
  month: "Daily applications, positive responses, and rejections this month",
  "3mo":
    "Weekly applications, positive responses, and rejections over 3 months",
  "6mo":
    "Weekly applications, positive responses, and rejections over 6 months",
};

export function MomentumChart({
  applications,
}: {
  applications: Application[];
}) {
  const [momentumRange, setMomentumRange] = useState<MomentumRange>("month");
  const momentumSeries = useMemo(
    () => buildMomentumSeries(applications, momentumRange),
    [applications, momentumRange],
  );

  return (
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
              <linearGradient
                id="applications-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
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
              <linearGradient id="rejections-fill" x1="0" y1="0" x2="0" y2="1">
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
            <span className="size-2 rounded-sm bg-[#7aa7ff]" /> Positive
            responses
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-sm bg-[#ff6b74]" /> Rejections
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
