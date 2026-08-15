import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "../supabase/env";

export const createClient = cache(async () => {
  const store = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (written) => {
        // Server Components can't set cookies; middleware refreshes them instead.
        try {
          for (const { name, value, options } of written) {
            store.set(name, value, options);
          }
        } catch {}
      },
    },
  });
});

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
