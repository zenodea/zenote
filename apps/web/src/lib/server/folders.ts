import "server-only";
import { cache } from "react";
import { createClient } from "./supabase";

export const getFolders = cache(async (vaultId: string): Promise<string[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("folders")
    .select("path")
    .eq("vault_id", vaultId)
    .order("path")
    .returns<{ path: string }[]>();

  if (error) throw new Error(`Could not load folders: ${error.message}`);

  return data.map((row) => row.path);
});
