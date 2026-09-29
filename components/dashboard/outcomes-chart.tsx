import { Cell, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { outcomes, type Outcome } from "@/lib/applications";
import type { ApplicationMetrics } from "@/lib/metrics";

const outcomeColors: Record<Outcome, string> = {
  Active: "#5ee3c2",
  Rejected: "#ff6b74",
  Offer: "#ffb562",
  Withdrawn: "#71869b",
};

export function OutcomesChart({ metrics }: { metrics: ApplicationMetrics }) {
  const counts: Record<Outcome, number> = {
    Active: metrics.active,
    Rejected: metrics.rejected,
    Offer: metrics.offers,
    Withdrawn: metrics.withdrawn,
  };
  const outcomeData = outcomes
    .map((name) => ({ name, value: counts[name] }))
    .filter((item) => item.value > 0);

  return (
    <Card className="gap-0 border-white/[0.07] bg-card/85 py-0 xl:col-span-5">
      <CardHeader className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
        <CardTitle className="text-base tracking-[-0.02em]">
          Current outcomes
        </CardTitle>
        <CardDescription>
          Where every application stands right now
        </CardDescription>
      </CardHeader>
      <CardContent className="grid min-h-[344px] items-center gap-3 px-5 py-5 sm:grid-cols-[1.15fr_.85fr] sm:px-6">
        <div className="relative mx-auto h-[230px] w-full max-w-[260px]">
          {outcomeData.length ? (
            <ChartContainer config={{}} className="h-full w-full aspect-auto">
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
                    <Cell key={entry.name} fill={outcomeColors[entry.name]} />
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
                <div
                  key={outcome}
                  className="flex items-center justify-between gap-4"
                >
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
  );
}
