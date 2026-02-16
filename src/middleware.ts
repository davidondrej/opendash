import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getSupabasePublicEnv();

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
        }

        response = NextResponse.next({ request });
        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Strip Supabase PKCE ?code= param after exchange to prevent cookie bloat (HTTP 431)
  if (user && request.nextUrl.searchParams.has("code")) {
    const cleanUrl = new URL(request.nextUrl.pathname, request.url);
    return NextResponse.redirect(cleanUrl);
  }

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/")) {
    return response;
  }

  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    const nextPath = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
