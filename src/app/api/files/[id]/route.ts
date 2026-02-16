import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("files")
    .select("id,name,content,project_id,created_at,updated_at")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ file: data });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: string;
    content?: string;
    projectId?: string | null;
  };

  const updates: { name?: string; content?: string; project_id?: string | null } = {};
  if (typeof body.name === "string") {
    if (!body.name.trim()) {
      return NextResponse.json({ error: "Field 'name' cannot be empty." }, { status: 400 });
    }
    updates.name = body.name.trim();
  }
  if (typeof body.content === "string") {
    updates.content = body.content;
  }
  if (body.projectId !== undefined) {
    updates.project_id = body.projectId;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields provided to update." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("files")
    .update(updates)
    .eq("id", id)
    .select("id,name,content,project_id,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ file: data });
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("files").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
