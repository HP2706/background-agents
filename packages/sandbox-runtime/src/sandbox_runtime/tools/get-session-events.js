/**
 * Get Session Events Tool — fetch recent events from a watched session.
 *
 * Use this for deeper analysis when an event batch suggests a problem
 * and you need more context to understand what happened.
 */
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { bridgeFetch, extractError } from "./_bridge-client.js";

function formatTimestamp(ts) {
  if (!ts) return "n/a";
  return new Date(ts).toISOString();
}

export default tool({
  name: "get-session-events",
  description:
    "Fetch recent events from a watched session for deeper analysis. Use when the event batch suggests a problem and you need more context.",
  args: {
    sessionId: z.string().describe("The ID of the watched session to fetch events from."),
    limit: z
      .number()
      .optional()
      .default(50)
      .describe("Maximum number of events to return. Defaults to 50."),
  },
  async execute(args) {
    try {
      const limit = args.limit ?? 50;
      // Fetch events from the target session directly (not via supervisor path).
      // bridgeFetch prefixes with /sessions/{thisSessionId}, so we build a
      // full URL to the target session's events endpoint instead.
      const BRIDGE_URL = process.env.CONTROL_PLANE_URL || "http://localhost:8787";
      const BRIDGE_TOKEN = process.env.SANDBOX_AUTH_TOKEN || "";
      const url = `${BRIDGE_URL}/sessions/${args.sessionId}/events?limit=${limit}`;
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BRIDGE_TOKEN}`,
        },
      });

      if (!response.ok) {
        const errorMessage = await extractError(response);

        if (response.status === 404) {
          return `Session "${args.sessionId}" not found. Use list-watched-sessions to see available sessions.`;
        }
        return `Failed to fetch session events: ${errorMessage} (HTTP ${response.status})`;
      }

      const { events } = await response.json();

      if (!events || events.length === 0) {
        return `No events found for session "${args.sessionId}".`;
      }

      const lines = [`${events.length} event(s) for session ${args.sessionId}:`, ""];

      for (const event of events) {
        const time = formatTimestamp(event.createdAt);
        const raw = event.data?.message || event.data?.content || event.type;
        const summary = typeof raw === "string" ? raw : JSON.stringify(raw);
        lines.push(`  [${time}] ${event.type}: ${summary.slice(0, 120)}`);
      }

      return lines.join("\n");
    } catch (error) {
      return `Failed to fetch session events: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
