import { NextRequest, NextResponse } from "next/server";
import { AuthError, resolveActor } from "@/lib/auth";
import { getPromptHarness } from "@/lib/prompt-harness";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

async function requireHuman(request: NextRequest) {
  const actor = await resolveActor(request);
  if (actor.type !== "human") {
    throw new AuthError(403, "Forbidden");
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireHuman(request);
    const systemPrompt = await getPromptHarness();
    return NextResponse.json({ systemPrompt });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireHuman(request);

    const body = (await request.json()) as { systemPrompt?: string };
    const systemPrompt = body.systemPrompt?.trim();

    if (!systemPrompt) {
      return NextResponse.json({ error: "Field 'systemPrompt' is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("prompt_harnesses")
      .upsert({ scope: "global", system_prompt: systemPrompt }, { onConflict: "scope" })
      .select("system_prompt")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ systemPrompt: data.system_prompt });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
