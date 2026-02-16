import { NextRequest, NextResponse } from "next/server";
import { AuthError, type Actor, resolveActor } from "@/lib/auth";
import { logAgentActivity } from "@/lib/activity-log";
import { getPromptHarness, wrapWithHarness } from "@/lib/prompt-harness";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

function logIfAgent(
  actor: Actor | null,
  action: "files.list" | "files.search" | "files.create",
  fileId: string | null,
  fileName: string | null,
  statusCode: number,
) {
  if (actor?.type !== "agent") return;
  logAgentActivity(actor, action, fileId, fileName, statusCode);
}

export async function GET(request: NextRequest) {
  let actor: Actor | null = null;
  try {
    actor = await resolveActor(request);
    const supabase = getSupabaseAdminClient();
    const q = request.nextUrl.searchParams.get("q");
    const action = q && q.trim() ? "files.search" : "files.list";

    let query = supabase
      .from("files")
      .select(
        actor.type === "agent"
          ? "id,name,created_at,updated_at"
          : "id,name,content,created_at,updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(100);

    if (q && q.trim()) {
      query = query.or(`name.ilike.%${q}%,content.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      logIfAgent(actor, action, null, null, 500);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logIfAgent(actor, action, null, null, 200);
    return NextResponse.json({ files: data ?? [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let actor: Actor | null = null;
  try {
    actor = await resolveActor(request);
    const body = (await request.json()) as {
      name?: string;
      content?: string;
    };

    if (!body?.name?.trim()) {
      logIfAgent(actor, "files.create", null, null, 400);
      return NextResponse.json({ error: "Field 'name' is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("files")
      .insert({
        name: body.name.trim(),
        content: body.content ?? "",
      })
      .select("id,name,content,created_at,updated_at")
      .single();

    if (error) {
      logIfAgent(actor, "files.create", null, body.name.trim(), 500);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (actor.type === "agent" && data) {
      const harness = await getPromptHarness();
      data.content = wrapWithHarness(harness, data.content);
    }

    logIfAgent(actor, "files.create", data?.id ?? null, data?.name ?? null, 201);
    return NextResponse.json({ file: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
