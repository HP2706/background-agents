/**
 * List Watched Sessions Tool — shows all sessions this supervisor is monitoring.
 *
 * Returns a formatted list with each session's ID, title, and current status.
 */
import { tool } from "@opencode-ai/plugin";
import { bridgeFetch, extractError } from "./_bridge-client.js";

export default tool({
  name: "list-watched-sessions",
  description: "List all sessions this supervisor is monitoring, with their current status.",
  args: {},
  async execute() {
    try {
      const response = await bridgeFetch("/supervisor/watched-sessions");

      if (!response.ok) {
        const errorMessage = await extractError(response);
        return `Failed to list watched sessions: ${errorMessage} (HTTP ${response.status})`;
      }

      const { sessions } = await response.json();

      if (!sessions || sessions.length === 0) {
        return "No watched sessions found.";
      }

      const lines = [`${sessions.length} watched session(s):`, ""];

      for (const session of sessions) {
        const addedAt = session.addedAt ? new Date(session.addedAt).toISOString() : "n/a";
        lines.push(
          `  ${session.sessionId}`,
          `    Title:   ${session.title || "(untitled)"}`,
          `    Added:   ${addedAt}`,
          ""
        );
      }

      return lines.join("\n");
    } catch (error) {
      return `Failed to list watched sessions: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
