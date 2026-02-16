import { ActivityState, Agent, formatDate, formatStatus } from "@/components/agents/types";

type AgentRowProps = {
  agent: Agent;
  isExpanded: boolean;
  isBusy: boolean;
  activityState?: ActivityState;
  onToggleExpanded: (agentId: string) => void;
  onRotate: (agent: Agent) => void;
  onRevoke: (agent: Agent) => void;
};

export default function AgentRow({
  agent,
  isExpanded,
  isBusy,
  activityState,
  onToggleExpanded,
  onRotate,
  onRevoke,
}: AgentRowProps) {
  return (
    <article className="rounded-xl border border-[var(--od-border)] bg-[var(--od-surface-1)]">
      <button
        type="button"
        onClick={() => onToggleExpanded(agent.id)}
        className="grid w-full grid-cols-1 gap-2 px-4 py-3 text-left md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center"
      >
        <div>
          <p className="font-medium text-[var(--od-text)]">{agent.name}</p>
          <p className="text-xs text-[var(--od-muted)]">Key prefix: {agent.key_prefix}</p>
        </div>
        <p className="text-sm text-[var(--od-soft-text)]">{formatStatus(agent.status)}</p>
        <p className="text-sm text-[var(--od-soft-text)]">Last used: {formatDate(agent.last_used_at)}</p>
        <p className="text-sm text-[var(--od-soft-text)]">Created: {formatDate(agent.created_at)}</p>
        <div className="flex items-center gap-2 md:justify-end">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRotate(agent);
            }}
            className="od-button-ghost px-2.5 py-1.5 text-xs"
            disabled={isBusy || agent.status !== "active"}
          >
            Rotate key
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRevoke(agent);
            }}
            className="od-button-ghost px-2.5 py-1.5 text-xs"
            disabled={isBusy || agent.status !== "active"}
          >
            Revoke
          </button>
        </div>
      </button>

      {isExpanded ? (
        <div className="border-t border-[var(--od-border)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--od-muted)]">Recent Activity</p>
          {activityState?.loading ? (
            <p className="mt-2 text-sm text-[var(--od-muted)]">Loading activity...</p>
          ) : activityState?.error ? (
            <p className="mt-2 text-sm text-[#f0ccd5]">{activityState.error}</p>
          ) : activityState?.items.length ? (
            <div className="mt-2 space-y-2">
              {activityState.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 gap-1 rounded-lg border border-[var(--od-border)] bg-[var(--od-surface-2)] px-3 py-2 text-sm md:grid-cols-[1.2fr_2fr_auto_auto]"
                >
                  <span className="text-[var(--od-soft-text)]">{item.action}</span>
                  <span className="truncate text-[var(--od-soft-text)]">{item.file_name ?? "(no file)"}</span>
                  <span className="text-[var(--od-muted)]">{item.status_code}</span>
                  <span className="text-[var(--od-muted)]">{formatDate(item.created_at)}</span>
                </div>
              ))}
              <p className="text-xs text-[var(--od-muted)]">
                Showing {activityState.items.length} of {activityState.total} events.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--od-muted)]">No activity recorded yet.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}
