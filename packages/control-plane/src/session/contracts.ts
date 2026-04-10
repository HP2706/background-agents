/**
 * Contract constants for Session Durable Object internal endpoints.
 * Router and SessionDO must both import these to prevent path drift.
 */

export const SessionInternalPaths = {
  init: "/internal/init",
  state: "/internal/state",
  prompt: "/internal/prompt",
  stop: "/internal/stop",
  sandboxEvent: "/internal/sandbox-event",
  participants: "/internal/participants",
  events: "/internal/events",
  artifacts: "/internal/artifacts",
  messages: "/internal/messages",
  createPr: "/internal/create-pr",
  wsToken: "/internal/ws-token",
  archive: "/internal/archive",
  unarchive: "/internal/unarchive",
  verifySandboxToken: "/internal/verify-sandbox-token",
  openaiTokenRefresh: "/internal/openai-token-refresh",
  spawnContext: "/internal/spawn-context",
  childSummary: "/internal/child-summary",
  updateTitle: "/internal/update-title",
  cancel: "/internal/cancel",
  childSessionUpdate: "/internal/child-session-update",
  // Supervisor endpoints
  supervisorForwardEvent: "/internal/supervisor-forward-event",
  supervisorWatchedSessions: "/internal/supervisor-watched-sessions",
  supervisorAddWatched: "/internal/supervisor-add-watched",
  supervisorRemoveWatched: "/internal/supervisor-remove-watched",
  supervisorGuidance: "/internal/supervisor-guidance",
  registerSupervisor: "/internal/register-supervisor",
} as const;

export type SessionInternalPath = (typeof SessionInternalPaths)[keyof typeof SessionInternalPaths];

const INTERNAL_ORIGIN = "http://internal";

export function buildSessionInternalUrl(path: SessionInternalPath, search?: string): string {
  return `${INTERNAL_ORIGIN}${path}${search ?? ""}`;
}
