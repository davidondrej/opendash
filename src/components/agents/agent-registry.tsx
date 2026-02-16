"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AgentRow from "@/components/agents/agent-row";
import { ActivityResponse, ActivityState, Agent, AgentListResponse, RegisterResponse } from "@/components/agents/types";

type RevealedSecret = {
  label: string;
  key: string;
};

export default function AgentRegistry() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [status, setStatus] = useState("Loading agents...");

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<RevealedSecret | null>(null);

  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [activityByAgent, setActivityByAgent] = useState<Record<string, ActivityState>>({});
  const [activeRequestAgentId, setActiveRequestAgentId] = useState<string | null>(null);

  const visibleAgents = useMemo(
    () => [...agents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [agents],
  );

  const loadAgents = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const response = await fetch("/api/agents", { credentials: "include" });
      const data = (await response.json()) as AgentListResponse;
      if (!response.ok) {
        setStatus(data.error ?? "Failed to load agents.");
        return;
      }
      setAgents(data.agents ?? []);
      setStatus(`Loaded ${(data.agents ?? []).length} agent(s).`);
    } catch {
      setStatus("Failed to load agents.");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setStatus("API key copied to clipboard.");
    } catch {
      setStatus("Failed to copy API key.");
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registerName.trim()) {
      setStatus("Agent runtime name is required.");
      return;
    }

    setIsRegistering(true);
    setStatus("Registering agent...");
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: registerName.trim() }),
      });
      const data = (await response.json()) as RegisterResponse;

      if (!response.ok || !data.agent || !data.apiKey) {
        setStatus(data.error ?? "Failed to register agent.");
        return;
      }

      setAgents((current) => [data.agent as Agent, ...current]);
      setRegisterName("");
      setIsRegisterOpen(false);
      setRevealedSecret({ label: `Created for ${data.agent.name}`, key: data.apiKey });
      setStatus(`Registered ${data.agent.name}. Save this key now.`);
    } catch {
      setStatus("Failed to register agent.");
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleRevoke(agent: Agent) {
    const confirmed = window.confirm(`Revoke ${agent.name}? Existing key access will stop immediately.`);
    if (!confirmed) return;

    setActiveRequestAgentId(agent.id);
    setStatus(`Revoking ${agent.name}...`);
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await response.json()) as RegisterResponse;
      if (!response.ok || !data.agent) {
        setStatus(data.error ?? "Failed to revoke agent.");
        return;
      }

      setAgents((current) => current.map((item) => (item.id === data.agent?.id ? (data.agent as Agent) : item)));
      setStatus(`Revoked ${agent.name}.`);
    } catch {
      setStatus("Failed to revoke agent.");
    } finally {
      setActiveRequestAgentId(null);
    }
  }

  async function handleRotate(agent: Agent) {
    setActiveRequestAgentId(agent.id);
    setStatus(`Rotating key for ${agent.name}...`);
    try {
      const response = await fetch(`/api/agents/${agent.id}/rotate`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json()) as RegisterResponse;
      if (!response.ok || !data.agent || !data.apiKey) {
        setStatus(data.error ?? "Failed to rotate key.");
        return;
      }

      setAgents((current) => current.map((item) => (item.id === data.agent?.id ? (data.agent as Agent) : item)));
      setRevealedSecret({ label: `Rotated for ${data.agent.name}`, key: data.apiKey });
      setStatus(`Rotated key for ${agent.name}. Save this key now.`);
    } catch {
      setStatus("Failed to rotate key.");
    } finally {
      setActiveRequestAgentId(null);
    }
  }

  async function handleToggleExpanded(agentId: string) {
    const nextValue = expandedAgentId === agentId ? null : agentId;
    setExpandedAgentId(nextValue);
    if (!nextValue || activityByAgent[nextValue]) return;

    setActivityByAgent((current) => ({
      ...current,
      [agentId]: { loading: true, error: null, items: [], total: 0 },
    }));

    try {
      const response = await fetch(`/api/agents/${agentId}/activity?limit=50&offset=0`, {
        credentials: "include",
      });
      const data = (await response.json()) as ActivityResponse;
      if (!response.ok) {
        setActivityByAgent((current) => ({
          ...current,
          [agentId]: { loading: false, error: data.error ?? "Failed to load activity.", items: [], total: 0 },
        }));
        return;
      }

      setActivityByAgent((current) => ({
        ...current,
        [agentId]: { loading: false, error: null, items: data.items ?? [], total: data.total ?? 0 },
      }));
    } catch {
      setActivityByAgent((current) => ({
        ...current,
        [agentId]: { loading: false, error: "Failed to load activity.", items: [], total: 0 },
      }));
    }
  }

  return (
    <section className="od-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="od-overline">OpenDash</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Agent Registry</h1>
          <p className="mt-2 text-sm text-[var(--od-muted)]">Register agent runtimes, rotate keys, and inspect access logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setIsRegisterOpen(true)} className="od-button-primary">
            Register agent
          </button>
          <button type="button" onClick={() => void loadAgents()} className="od-button-ghost" disabled={isLoadingList}>
            {isLoadingList ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {revealedSecret ? (
        <div className="mt-4 rounded-xl border border-[var(--od-strong-border)] bg-[var(--od-surface-2)] p-3">
          <p className="text-sm font-medium text-[var(--od-soft-text)]">API key ({revealedSecret.label})</p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--od-text)]">{revealedSecret.key}</p>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => void copyKey(revealedSecret.key)} className="od-button-ghost">
              Copy key
            </button>
            <button type="button" onClick={() => setRevealedSecret(null)} className="od-button-ghost">
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {isRegisterOpen ? (
        <form onSubmit={handleRegister} className="mt-4 rounded-xl border border-[var(--od-border)] bg-[var(--od-surface-2)] p-3">
          <label className="block text-sm">
            <span className="mb-1.5 block text-[var(--od-soft-text)]">Agent runtime name</span>
            <input
              value={registerName}
              onChange={(event) => setRegisterName(event.target.value)}
              className="od-input w-full"
              placeholder="AgentZero"
              required
            />
          </label>
          <div className="mt-3 flex items-center gap-2">
            <button type="submit" className="od-button-primary" disabled={isRegistering}>
              {isRegistering ? "Registering..." : "Create key"}
            </button>
            <button type="button" className="od-button-ghost" onClick={() => setIsRegisterOpen(false)} disabled={isRegistering}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <p className="mt-4 text-sm text-[var(--od-muted)]">{status}</p>

      <div className="mt-4 space-y-3">
        {visibleAgents.length === 0 ? (
          <div className="rounded-xl border border-[var(--od-border)] bg-[var(--od-surface-1)] p-4 text-sm text-[var(--od-muted)]">
            No agents registered yet.
          </div>
        ) : (
          visibleAgents.map((agent) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              isExpanded={expandedAgentId === agent.id}
              isBusy={activeRequestAgentId === agent.id}
              activityState={activityByAgent[agent.id]}
              onToggleExpanded={handleToggleExpanded}
              onRotate={(target) => void handleRotate(target)}
              onRevoke={(target) => void handleRevoke(target)}
            />
          ))
        )}
      </div>
    </section>
  );
}
