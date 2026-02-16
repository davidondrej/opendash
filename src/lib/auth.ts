import type { NextRequest } from "next/server";
import { hashApiKey, readApiKeyPrefix } from "@/lib/api-key";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const AGENT_KEY_PREFIX = "odak_";
const AGENT_NAME_HEADER = "x-opendash-agent-name";

export type HumanActor = {
  type: "human";
  userId: string;
  email: string | null;
};

export type AgentActor = {
  type: "agent";
  agentId: string;
  agentName: string;
};

export type Actor = HumanActor | AgentActor;

export class AuthError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function readBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ", 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token.trim();
}

export async function resolveActor(request: NextRequest): Promise<Actor> {
  const serverClient = getSupabaseServerClient(request);
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (user) {
    return {
      type: "human",
      userId: user.id,
      email: user.email ?? null,
    };
  }

  const rawKey = readBearerToken(request);
  if (!rawKey || !rawKey.startsWith(AGENT_KEY_PREFIX)) {
    throw new AuthError(401, "Unauthorized");
  }

  const agentName = request.headers.get(AGENT_NAME_HEADER)?.trim();
  if (!agentName) {
    throw new AuthError(400, "Missing required header: X-OpenDash-Agent-Name");
  }

  const keyPrefix = readApiKeyPrefix(rawKey);
  const keyHash = hashApiKey(rawKey);
  const supabase = getSupabaseAdminClient();

  const { data: agent, error } = await supabase
    .from("agents")
    .select("id,status")
    .eq("key_prefix", keyPrefix)
    .eq("api_key_hash", keyHash)
    .single();

  if (error || !agent) {
    throw new AuthError(401, "Unauthorized");
  }

  if (agent.status !== "active") {
    throw new AuthError(403, "Agent key revoked");
  }

  await supabase
    .from("agents")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", agent.id);

  return {
    type: "agent",
    agentId: agent.id,
    agentName,
  };
}
