import type { SessionStatus } from "@open-inspect/shared";
import { generateId } from "../../../auth/crypto";
import type { Logger } from "../../../logger";
import type { SessionRepository } from "../../repository";
import type { SessionRow } from "../../types";

/** How long to wait before draining the event buffer (ms). */
const DEBOUNCE_WINDOW_MS = 15_000;

export interface SupervisorHandlerDeps {
  repository: Pick<
    SessionRepository,
    | "getSessionRole"
    | "addWatchedSession"
    | "removeWatchedSession"
    | "listWatchedSessions"
    | "bufferForwardedEvent"
    | "getForwardedEventBufferCount"
  >;
  getSession: () => SessionRow | null;
  env: { SESSION: DurableObjectNamespace };
  log: Logger;
  scheduleAlarm: (timestamp: number) => Promise<void>;
  getCurrentAlarm: () => Promise<number | null>;
  broadcast: (message: {
    type: "watched_session_update";
    watchedSessionId: string;
    status: SessionStatus;
    title: string | null;
  }) => void;
}

export interface SupervisorHandler {
  forwardEvent: (request: Request) => Promise<Response>;
  listWatched: () => Response;
  addWatched: (request: Request) => Promise<Response>;
  removeWatched: (request: Request) => Promise<Response>;
  sendGuidance: (request: Request) => Promise<Response>;
  registerSupervisor: (request: Request) => Promise<Response>;
}

export function createSupervisorHandler(deps: SupervisorHandlerDeps): SupervisorHandler {
  function ensureSupervisor(): Response | null {
    const role = deps.repository.getSessionRole();
    if (role !== "supervisor") {
      return Response.json({ error: "This session is not a supervisor" }, { status: 400 });
    }
    return null;
  }

  return {
    async forwardEvent(request: Request): Promise<Response> {
      const roleErr = ensureSupervisor();
      if (roleErr) return roleErr;

      const body = (await request.json()) as {
        sourceSessionId: string;
        sourceSessionTitle: string | null;
        event: Record<string, unknown>;
      };

      if (!body.sourceSessionId || !body.event) {
        return Response.json({ error: "sourceSessionId and event are required" }, { status: 400 });
      }

      const eventType = (body.event.type as string) ?? "unknown";

      deps.repository.bufferForwardedEvent(
        generateId(),
        body.sourceSessionId,
        body.sourceSessionTitle ?? null,
        eventType,
        JSON.stringify(body.event),
        Date.now()
      );

      // Schedule a debounced alarm to drain the buffer if one isn't already pending
      const currentAlarm = await deps.getCurrentAlarm();
      const drainDeadline = Date.now() + DEBOUNCE_WINDOW_MS;
      if (!currentAlarm || currentAlarm > drainDeadline) {
        await deps.scheduleAlarm(drainDeadline);
      }

      return Response.json({ ok: true });
    },

    listWatched(): Response {
      const roleErr = ensureSupervisor();
      if (roleErr) return roleErr;

      const watched = deps.repository.listWatchedSessions();
      return Response.json({
        sessions: watched.map((w) => ({
          sessionId: w.session_id,
          title: w.session_title,
          addedAt: w.added_at,
        })),
      });
    },

    async addWatched(request: Request): Promise<Response> {
      const roleErr = ensureSupervisor();
      if (roleErr) return roleErr;

      const body = (await request.json()) as {
        sessionId: string;
        title?: string | null;
      };

      if (!body.sessionId) {
        return Response.json({ error: "sessionId is required" }, { status: 400 });
      }

      deps.repository.addWatchedSession(body.sessionId, body.title ?? null);

      // Notify the watched session that this supervisor is watching it
      const session = deps.getSession();
      if (session) {
        const targetDoId = deps.env.SESSION.idFromName(body.sessionId);
        const targetStub = deps.env.SESSION.get(targetDoId);
        const supervisorId = session.session_name ?? session.id;
        // Fire and forget — don't block on the target session's response
        targetStub
          .fetch(
            new Request("https://internal/internal/register-supervisor", {
              method: "POST",
              body: JSON.stringify({ supervisorSessionId: supervisorId }),
            })
          )
          .catch((err) => {
            deps.log.warn("Failed to register supervisor on watched session", {
              targetSessionId: body.sessionId,
              error: String(err),
            });
          });
      }

      return Response.json({ ok: true }, { status: 201 });
    },

    async removeWatched(request: Request): Promise<Response> {
      const roleErr = ensureSupervisor();
      if (roleErr) return roleErr;

      const body = (await request.json()) as { sessionId: string };
      if (!body.sessionId) {
        return Response.json({ error: "sessionId is required" }, { status: 400 });
      }

      deps.repository.removeWatchedSession(body.sessionId);
      return Response.json({ ok: true });
    },

    async sendGuidance(request: Request): Promise<Response> {
      const roleErr = ensureSupervisor();
      if (roleErr) return roleErr;

      const body = (await request.json()) as {
        targetSessionId: string;
        content: string;
      };

      if (!body.targetSessionId || !body.content) {
        return Response.json(
          { error: "targetSessionId and content are required" },
          { status: 400 }
        );
      }

      // Verify the target is in our watch list
      const watched = deps.repository.listWatchedSessions();
      const isWatched = watched.some((w) => w.session_id === body.targetSessionId);
      if (!isWatched) {
        return Response.json(
          { error: `Session ${body.targetSessionId} is not in the watch list` },
          { status: 403 }
        );
      }

      // Enqueue guidance as a prompt on the target session
      const targetDoId = deps.env.SESSION.idFromName(body.targetSessionId);
      const targetStub = deps.env.SESSION.get(targetDoId);

      const promptResponse = await targetStub.fetch(
        new Request("https://internal/internal/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `[Supervisor Guidance]\n\n${body.content}`,
            authorId: "supervisor",
            source: "automation",
          }),
        })
      );

      if (!promptResponse.ok) {
        const errBody = await promptResponse.text();
        deps.log.error("Failed to enqueue guidance on target session", {
          targetSessionId: body.targetSessionId,
          status: promptResponse.status,
          error: errBody,
        });
        return Response.json(
          { error: "Failed to send guidance to target session" },
          { status: 502 }
        );
      }

      return Response.json({ ok: true, targetSessionId: body.targetSessionId });
    },

    async registerSupervisor(request: Request): Promise<Response> {
      // This endpoint is called on WATCHED sessions (not supervisors)
      // to register that a supervisor is watching them.
      // The DO stores the supervisor ID in a transient set for event forwarding.
      const body = (await request.json()) as { supervisorSessionId: string };
      if (!body.supervisorSessionId) {
        return Response.json({ error: "supervisorSessionId is required" }, { status: 400 });
      }
      // The actual storage in the transient set is handled by the DO wrapper
      return Response.json({ ok: true, supervisorSessionId: body.supervisorSessionId });
    },
  };
}
