import { NextRequest, NextResponse } from "next/server";
import { AuthError, type Actor, resolveActor } from "@/lib/auth";
import { logAgentActivity } from "@/lib/activity-log";
import { getPromptHarness, wrapWithHarness } from "@/lib/prompt-harness";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function logIfAgent(
  actor: Actor | null,
  action: "files.get" | "files.update" | "files.delete",
  fileId: string | null,
  fileName: string | null,
  statusCode: number,
) {
  if (actor?.type !== "agent") return;
  logAgentActivity(actor, action, fileId, fileName, statusCode);
}

export async function GET(request: NextRequest, context: RouteContext) {
  let actor: Actor | null = null;
  const { id } = await context.params;
  try {
    actor = await resolveActor(request);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("files")
      .select("id,name,content,created_at,updated_at")
      .eq("id", id)
      .single();

    if (error) {
      logIfAgent(actor, "files.get", id, null, 404);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (actor.type === "agent" && data) {
      const harness = await getPromptHarness();
      data.content = wrapWithHarness(harness, data.content);
    }

    logIfAgent(actor, "files.get", data?.id ?? id, data?.name ?? null, 200);
    return NextResponse.json({ file: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  let actor: Actor | null = null;
  const { id } = await context.params;
  try {
    actor = await resolveActor(request);
    const body = (await request.json()) as {
      name?: string;
      content?: string;
    };

    const updates: { name?: string; content?: string } = {};
    if (typeof body.name === "string") {
      if (!body.name.trim()) {
        logIfAgent(actor, "files.update", id, null, 400);
        return NextResponse.json({ error: "Field 'name' cannot be empty." }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if (typeof body.content === "string") {
      updates.content = body.content;
    }
    if (Object.keys(updates).length === 0) {
      logIfAgent(actor, "files.update", id, null, 400);
      return NextResponse.json({ error: "No fields provided to update." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("files")
      .update(updates)
      .eq("id", id)
      .select("id,name,content,created_at,updated_at")
      .single();

    if (error) {
      logIfAgent(actor, "files.update", id, null, 500);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (actor.type === "agent" && data) {
      const harness = await getPromptHarness();
      data.content = wrapWithHarness(harness, data.content);
    }

    logIfAgent(actor, "files.update", data?.id ?? id, data?.name ?? null, 200);
    return NextResponse.json({ file: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  let actor: Actor | null = null;
  const { id } = await context.params;
  try {
    actor = await resolveActor(request);
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("files").delete().eq("id", id);

    if (error) {
      logIfAgent(actor, "files.delete", id, null, 500);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logIfAgent(actor, "files.delete", id, null, 200);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
