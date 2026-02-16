import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

export type FileRecord = {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export function getSupabaseAdminClient() {
  const env = getSupabaseEnv();
  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
