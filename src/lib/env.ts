// Next.js only inlines NEXT_PUBLIC_* vars into client bundles when accessed
// as literal property access (process.env.NEXT_PUBLIC_X), NOT dynamic bracket
// access (process.env[key]). So public env must use direct access.

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing required env var: NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { url, anonKey };
}

export function getSupabaseEnv() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("Missing required env var: SUPABASE_SERVICE_ROLE_KEY");
  return { ...getSupabasePublicEnv(), serviceRoleKey };
}
