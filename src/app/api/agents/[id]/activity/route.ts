import { NextRequest, NextResponse } from "next/server";
import { AuthError, resolveActor } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireHuman(request: NextRequest) {
  const actor = await resolveActor(request);
  if (actor.type !== "human") throw new AuthError(403, "Forbidden");
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireHuman(request);
    const { id } = await context.params;

    const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
    const rawOffset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

    const supabase = getSupabaseAdminClient();
    const { data, error, count } = await supabase
      .from("agent_activity")
      .select("*", { count: "exact" })
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [], limit, offset, total: count ?? 0 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
