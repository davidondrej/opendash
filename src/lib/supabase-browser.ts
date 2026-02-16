import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/env";

let supabaseBrowserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (supabaseBrowserClient) {
    return supabaseBrowserClient;
  }

  const env = getSupabasePublicEnv();
  supabaseBrowserClient = createBrowserClient(env.url, env.anonKey);
  return supabaseBrowserClient;
}
