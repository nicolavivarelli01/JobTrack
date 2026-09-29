import type { SupabaseClient } from "@supabase/supabase-js";

import {
  applicationColumns,
  applicationFromRow,
  toApplicationRow,
  type Application,
  type ApplicationDraft,
  type ApplicationRow,
} from "@/lib/applications";

// Row-level security scopes every query to the signed-in user, so reads need
// no user filter. Inserts still set user_id to satisfy the insert policy.

const table = "applications";
const insertBatchSize = 200;

function toApplications(data: unknown) {
  return ((data ?? []) as ApplicationRow[]).map(applicationFromRow);
}

export async function fetchApplications(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from(table)
    .select(applicationColumns)
    .order("applied_at", { ascending: false });

  if (error) throw error;
  return toApplications(data);
}

export async function createApplication(
  supabase: SupabaseClient,
  userId: string,
  draft: ApplicationDraft,
) {
  const { data, error } = await supabase
    .from(table)
    .insert({ user_id: userId, ...toApplicationRow(draft) })
    .select(applicationColumns)
    .single();

  if (error) throw error;
  return applicationFromRow(data as ApplicationRow);
}

export async function updateApplication(
  supabase: SupabaseClient,
  id: string,
  draft: ApplicationDraft,
) {
  const { data, error } = await supabase
    .from(table)
    .update(toApplicationRow(draft))
    .eq("id", id)
    .select(applicationColumns)
    .single();

  if (error) throw error;
  return applicationFromRow(data as ApplicationRow);
}

/**
 * Inserts in batches. `onBatch` receives each saved batch, so rows that made
 * it in are not lost when a later batch fails.
 */
export async function createApplications(
  supabase: SupabaseClient,
  userId: string,
  drafts: ApplicationDraft[],
  onBatch: (applications: Application[]) => void,
) {
  for (let start = 0; start < drafts.length; start += insertBatchSize) {
    const { data, error } = await supabase
      .from(table)
      .insert(
        drafts
          .slice(start, start + insertBatchSize)
          .map((draft) => ({ user_id: userId, ...toApplicationRow(draft) })),
      )
      .select(applicationColumns);

    if (error) throw error;
    onBatch(toApplications(data));
  }
}

/** Re-inserts a deleted application with its original id, for undo. */
export async function restoreApplication(
  supabase: SupabaseClient,
  userId: string,
  application: Application,
) {
  const { data, error } = await supabase
    .from(table)
    .insert({
      id: application.id,
      user_id: userId,
      ...toApplicationRow(application),
      pinned: application.pinned,
    })
    .select(applicationColumns)
    .single();

  if (error) throw error;
  return applicationFromRow(data as ApplicationRow);
}

export async function setApplicationPinned(
  supabase: SupabaseClient,
  id: string,
  pinned: boolean,
) {
  const { error } = await supabase.from(table).update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function deleteApplication(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

/**
 * Copies applications saved in this browser before accounts existed. The
 * legacy id makes it idempotent if it runs twice.
 */
export async function importLegacyApplications(
  supabase: SupabaseClient,
  userId: string,
  applications: Application[],
) {
  const { error } = await supabase.from(table).upsert(
    applications.map((application) => ({
      user_id: userId,
      legacy_id: application.id,
      ...toApplicationRow(application),
    })),
    { onConflict: "user_id,legacy_id", ignoreDuplicates: true },
  );

  if (error) throw error;
}
