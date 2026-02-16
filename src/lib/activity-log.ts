import type { Actor } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type AgentActivityAction =
  | "files.list"
  | "files.search"
  | "files.get"
  | "files.create"
  | "files.update"
  | "files.delete";

export function logAgentActivity(
  actor: Actor,
  action: AgentActivityAction,
  fileId: string | null,
  fileName: string | null,
  statusCode: number,
): void {
  if (actor.type !== "agent") return;

  const supabase = getSupabaseAdminClient();
  const base = {
    agent_id: actor.agentId,
    action,
    file_id: fileId,
  };

  void (async () => {
    const { error } = await supabase.from("agent_activity").insert({
      ...base,
      agent_name: actor.agentName,
      file_name: fileName,
      status_code: statusCode,
      details: { agent_name: actor.agentName, file_name: fileName, status_code: statusCode },
    });

    if (!error) return;

    await supabase.from("agent_activity").insert({
      ...base,
      details: { agent_name: actor.agentName, file_name: fileName, status_code: statusCode },
    });
  })();
}
