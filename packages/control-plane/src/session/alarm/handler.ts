import type { Logger } from "../../logger";
import { evaluateExecutionTimeout } from "../../sandbox/lifecycle/decisions";
import type { SandboxLifecycleManager } from "../../sandbox/lifecycle/manager";
import type { SessionMessageQueue } from "../message-queue";
import type { SessionRepository } from "../repository";

export interface AlarmHandlerDeps {
  repository: Pick<
    SessionRepository,
    | "getProcessingMessageWithStartedAt"
    | "getSessionRole"
    | "drainForwardedEventBuffer"
    | "clearForwardedEvents"
  >;
  messageQueue: Pick<SessionMessageQueue, "failStuckProcessingMessage">;
  lifecycleManager: Pick<SandboxLifecycleManager, "handleAlarm">;
  executionTimeoutMs: number;
  now: () => number;
  getLog: () => Logger;
  enqueueReviewPrompt: (
    events: Array<{
      id: string;
      source_session_id: string;
      source_session_title: string | null;
      event_type: string;
      event_data: string;
      received_at: number;
    }>
  ) => Promise<void>;
}

export interface AlarmHandler {
  handle: () => Promise<void>;
}

/**
 * Durable Object alarm handler.
 *
 * Checks for stuck processing messages (defense-in-depth execution timeout)
 * before delegating to lifecycle alarm processing. For supervisor sessions,
 * also drains the forwarded event buffer and enqueues a review prompt.
 */
export function createAlarmHandler(deps: AlarmHandlerDeps): AlarmHandler {
  return {
    async handle(): Promise<void> {
      // Execution timeout check: if a message has been in 'processing' longer than
      // the configured timeout, fail it. This is idempotent - if the message was
      // already failed (by onSandboxTerminating or a prior alarm),
      // getProcessingMessageWithStartedAt() returns null.
      const processing = deps.repository.getProcessingMessageWithStartedAt();
      if (processing?.started_at) {
        const now = deps.now();
        const result = evaluateExecutionTimeout(
          processing.started_at,
          { timeoutMs: deps.executionTimeoutMs },
          now
        );
        if (result.isTimedOut) {
          deps.getLog().warn("Execution timeout: message stuck in processing", {
            event: "execution.timeout",
            message_id: processing.id,
            elapsed_ms: result.elapsedMs,
            timeout_ms: deps.executionTimeoutMs,
          });
          await deps.messageQueue.failStuckProcessingMessage();
        }
      }

      // Supervisor: drain forwarded event buffer and enqueue review prompt
      if (deps.repository.getSessionRole() === "supervisor") {
        const bufferedEvents = deps.repository.drainForwardedEventBuffer(100);
        if (bufferedEvents.length > 0) {
          deps.getLog().info("Supervisor draining event buffer", {
            event_count: bufferedEvents.length,
          });
          await deps.enqueueReviewPrompt(bufferedEvents);
          deps.repository.clearForwardedEvents(bufferedEvents.map((e) => e.id));
        }
      }

      await deps.lifecycleManager.handleAlarm();
    },
  };
}
