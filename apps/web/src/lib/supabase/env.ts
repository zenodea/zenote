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
