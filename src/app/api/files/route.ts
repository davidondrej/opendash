import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const q = request.nextUrl.searchParams.get("q");

    let query = supabase
      .from("files")
      .select("id,name,content,project_id,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (q && q.trim()) {
      query = query.or(`name.ilike.%${q}%,content.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ files: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      content?: string;
      projectId?: string | null;
    };

    if (!body?.name?.trim()) {
      return NextResponse.json({ error: "Field 'name' is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("files")
      .insert({
        name: body.name.trim(),
        content: body.content ?? "",
        project_id: body.projectId ?? null,
      })
      .select("id,name,content,project_id,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ file: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
