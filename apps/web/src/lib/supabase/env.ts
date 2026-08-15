// Both values are public by design (the anon key is safe in the browser), but
// @supabase/ssr throws an unhelpful error when either is missing, and that
// happens inside middleware — i.e. on every route, including /login.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Locally: copy apps/web/.env.example to apps/web/.env.local and run " +
        "`npm run db:start`. In production: set both in the Vercel project.",
    );
  }

  return { url, anonKey };
}
