"use server";

import { createClient, getUserId } from "@/lib/server/supabase";

export async function loadSettings(): Promise<Record<string, unknown> | null> {
  if (!(await getUserId())) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("data")
    .maybeSingle();

  if (error || !data) return null;
  return (data.data as Record<string, unknown>) ?? null;
}

export async function saveSettings(
  data: Record<string, unknown>,
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const supabase = await createClient();
  await supabase.from("user_settings").upsert({ user_id: userId, data });
}
