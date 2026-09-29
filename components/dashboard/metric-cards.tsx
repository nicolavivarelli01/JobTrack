import {
  Activity,
  BriefcaseBusiness,
  Check,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ApplicationMetrics } from "@/lib/metrics";

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

export function MetricCards({ metrics }: { metrics: ApplicationMetrics }) {
  return (
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
  );
}
