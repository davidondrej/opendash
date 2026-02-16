export type Agent = {
  id: string;
  name: string;
  key_prefix: string;
  status: "active" | "revoked";
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type ActivityItem = {
  id: string;
  action: string;
  file_name: string | null;
  status_code: number;
  created_at: string;
};

export type ActivityState = {
  loading: boolean;
  error: string | null;
  items: ActivityItem[];
  total: number;
};

export type ActivityResponse = {
  items: ActivityItem[];
  total: number;
  error?: string;
};

export type AgentListResponse = {
  agents?: Agent[];
  error?: string;
};

export type RegisterResponse = {
  agent?: Agent;
  apiKey?: string;
  error?: string;
};

export function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function formatStatus(status: Agent["status"]) {
  return status === "active" ? "Active" : "Revoked";
}
