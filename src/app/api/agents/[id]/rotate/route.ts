import { NextRequest, NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api-key";
import { AuthError, resolveActor } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireHuman(request: NextRequest) {
  const actor = await resolveActor(request);
  if (actor.type !== "human") throw new AuthError(403, "Forbidden");
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireHuman(request);
    const { id } = await context.params;

    const supabase = getSupabaseAdminClient();
    const { data: existing, error: lookupError } = await supabase
      .from("agents")
      .select("id,status")
      .eq("id", id)
      .single();

    if (lookupError || !existing) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    if (existing.status !== "active") {
      return NextResponse.json({ error: "Cannot rotate key for revoked agent." }, { status: 400 });
    }

    const generated = generateApiKey();
    const { data, error } = await supabase
      .from("agents")
      .update({ api_key_hash: generated.hash, key_prefix: generated.prefix })
      .eq("id", id)
      .select("id,name,key_prefix,status,created_at,last_used_at,revoked_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agent: data, apiKey: generated.raw });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
