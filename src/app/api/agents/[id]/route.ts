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

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .select("id,name,key_prefix,status,created_at,last_used_at,revoked_at")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    return NextResponse.json({ agent: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireHuman(request);
    const { id } = await context.params;

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,name,key_prefix,status,created_at,last_used_at,revoked_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    return NextResponse.json({ agent: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
