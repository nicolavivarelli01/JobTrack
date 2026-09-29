"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";

import * as api from "@/lib/applications-api";
import type { Application, ApplicationDraft } from "@/lib/applications";
import { readLegacyApplications } from "@/lib/legacy-storage";
import { errorMessage, pluralize } from "@/lib/utils";

function insertAt<T>(items: T[], index: number, item: T) {
  const next = [...items];
  next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
  return next;
}

/**
 * The signed-in user's applications, with optimistic pin and delete, undo for
 * deletes, and toasts for every outcome.
 */
export function useApplications(supabase: SupabaseClient, userId: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        await migrateLegacyApplications(supabase, userId);
        const loaded = await api.fetchApplications(supabase);
        if (!cancelled) setApplications(loaded);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            errorMessage(caughtError, "Your applications could not be loaded."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken, supabase, userId]);

  async function save(draft: ApplicationDraft, id?: string) {
    try {
      if (id) {
        const updated = await api.updateApplication(supabase, id, draft);
        setApplications((current) =>
          current.map((application) =>
            application.id === id ? updated : application,
          ),
        );
        toast.success("Application updated");
      } else {
        const created = await api.createApplication(supabase, userId, draft);
        setApplications((current) => [created, ...current]);
        toast.success("Application added");
      }
      return true;
    } catch (caughtError) {
      toast.error("Application could not be saved", {
        description: errorMessage(caughtError, "Please try again."),
      });
      return false;
    }
  }

  async function importMany(drafts: ApplicationDraft[]) {
    const imported: Application[] = [];

    try {
      await api.createApplications(supabase, userId, drafts, (batch) =>
        imported.push(...batch),
      );
      toast.success(`${pluralize(imported.length, "application")} imported`);
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

  async function togglePinned(application: Application) {
    const pinned = !application.pinned;
    const setPinned = (value: boolean) =>
      setApplications((current) =>
        current.map((item) =>
          item.id === application.id ? { ...item, pinned: value } : item,
        ),
      );
    setPinned(pinned);

    try {
      await api.setApplicationPinned(supabase, application.id, pinned);
    } catch (caughtError) {
      setPinned(!pinned);
      toast.error(
        `Application could not be ${pinned ? "pinned" : "unpinned"}`,
        {
          description: errorMessage(caughtError, "Please try again."),
        },
      );
    }
  }

  async function restore(application: Application, index: number) {
    try {
      const restored = await api.restoreApplication(
        supabase,
        userId,
        application,
      );
      setApplications((current) => insertAt(current, index, restored));
      toast.success("Application restored");
    } catch (caughtError) {
      toast.error("Application could not be restored", {
        description: errorMessage(caughtError, "Please try again."),
      });
    }
  }

  async function remove(application: Application) {
    const index = applications.findIndex((item) => item.id === application.id);
    setApplications((current) =>
      current.filter((item) => item.id !== application.id),
    );

    try {
      await api.deleteApplication(supabase, application.id);
    } catch (caughtError) {
      setApplications((current) => insertAt(current, index, application));
      toast.error("Application could not be deleted", {
        description: errorMessage(caughtError, "Please try again."),
      });
      return;
    }

    toast("Application removed", {
      description: `${application.company} · ${application.role}`,
      action: {
        label: "Undo",
        onClick: () => void restore(application, index),
      },
    });
  }

  return {
    applications,
    loading,
    error,
    reload: () => setReloadToken((current) => current + 1),
    save,
    importMany,
    togglePinned,
    remove,
  };
}

async function migrateLegacyApplications(
  supabase: SupabaseClient,
  userId: string,
) {
  const migrationKey = `jobtrack.local-migrated.${userId}`;
  if (window.localStorage.getItem(migrationKey)) return;

  const legacy = readLegacyApplications();
  if (legacy.length > 0) {
    await api.importLegacyApplications(supabase, userId, legacy);
    toast.success(`${pluralize(legacy.length, "saved application")} imported`);
  }

  window.localStorage.setItem(migrationKey, "true");
}
