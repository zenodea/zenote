"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // /login and / share the root layout, so without this the soft navigation
  // keeps the logged-in chrome and renders the login page inside it.
  revalidatePath("/", "layout");
  redirect("/login");
}
