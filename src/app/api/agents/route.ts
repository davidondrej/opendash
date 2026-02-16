import { NextRequest, NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api-key";
import { AuthError, resolveActor } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

async function requireHuman(request: NextRequest) {
  const actor = await resolveActor(request);
  if (actor.type !== "human") throw new AuthError(403, "Forbidden");
}

export async function GET(request: NextRequest) {
  try {
    await requireHuman(request);

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .select("id,name,key_prefix,status,created_at,last_used_at,revoked_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agents: data ?? [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireHuman(request);

    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Field 'name' is required." }, { status: 400 });
    }

    const generated = generateApiKey();
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name,
        api_key_hash: generated.hash,
        key_prefix: generated.prefix,
        status: "active",
      })
      .select("id,name,key_prefix,status,created_at,last_used_at,revoked_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agent: data, apiKey: generated.raw }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
