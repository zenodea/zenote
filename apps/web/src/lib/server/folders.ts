import "server-only";
import { cache } from "react";
import { createClient } from "./supabase";

// Only empty folders live here; the rest are implied by note slugs.
export const getFolders = cache(async (): Promise<string[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("folders")
    .select("path")
    .order("path")
    .returns<{ path: string }[]>();

  if (error) throw new Error(`Could not load folders: ${error.message}`);

  return data.map((row) => row.path);
});
