import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env";

export function getSupabaseServerClient(request: NextRequest) {
  const env = getSupabasePublicEnv();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        void cookiesToSet;
        // No-op: auth resolver only reads existing session cookies.
      },
    },
  });
}
