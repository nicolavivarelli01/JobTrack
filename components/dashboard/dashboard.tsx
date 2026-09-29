"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { CalendarDays, CircleDot, Cloud } from "lucide-react";

import { ApplicationDialog } from "@/components/applications/application-dialog";
import { ApplicationsPanel } from "@/components/applications/applications-panel";
import { LoadingScreen } from "@/components/auth-screen";
import { ApplicationFlowCard } from "@/components/dashboard/application-flow";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { IOSInstallHint } from "@/components/dashboard/ios-install-hint";
import { LoadErrorBanner } from "@/components/dashboard/load-error-banner";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { MomentumChart } from "@/components/dashboard/momentum-chart";
import { OutcomesChart } from "@/components/dashboard/outcomes-chart";
import { useApplications } from "@/hooks/use-applications";
import type { Application } from "@/lib/applications";
import { computeMetrics } from "@/lib/metrics";

export function Dashboard({
  supabase,
  user,
  onSignOut,
}: {
  supabase: SupabaseClient;
  user: User;
  onSignOut: () => Promise<void>;
}) {
  const {
    applications,
    loading,
    error,
    reload,
    save,
    importMany,
    togglePinned,
    remove,
  } = useApplications(supabase, user.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApplication, setEditingApplication] =
    useState<Application | null>(null);

  const metrics = useMemo(() => computeMetrics(applications), [applications]);

  function openApplicationDialog(application: Application | null) {
    setEditingApplication(application);
    setDialogOpen(true);
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-[100dvh]">
      <DashboardHeader
        email={user.email}
        onSignOut={() => void onSignOut()}
        onAdd={() => openApplicationDialog(null)}
      />

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

        {error && <LoadErrorBanner message={error} onRetry={reload} />}

        <MetricCards metrics={metrics} />

        <section className="mt-4 grid gap-4 xl:grid-cols-12">
          <MomentumChart applications={applications} />
          <OutcomesChart metrics={metrics} />
        </section>

        <ApplicationFlowCard metrics={metrics} />

        <ApplicationsPanel
          applications={applications}
          onAdd={() => openApplicationDialog(null)}
          onEdit={openApplicationDialog}
          onTogglePin={togglePinned}
          onDelete={remove}
          onImport={importMany}
        />

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
        onSave={save}
      />
    </div>
  );
}
