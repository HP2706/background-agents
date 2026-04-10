/**
 * Send Guidance Tool — inject corrective instructions into a watched session.
 *
 * Use this when the supervisor detects problems like repeated errors,
 * stalls, or conflicts in a watched session.
 */
import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { bridgeFetch, extractError } from "./_bridge-client.js";

export default tool({
  name: "send-guidance",
  description:
    "Send guidance to a watched session. Use this to inject corrective instructions when you detect a problem like repeated errors, stalls, or conflicts.",
  args: {
    sessionId: z.string().describe("The ID of the watched session to send guidance to."),
    content: z
      .string()
      .describe(
        "The guidance message to inject. Be specific about the problem you detected and the corrective action the session should take."
      ),
  },
  async execute(args) {
    try {
      const response = await bridgeFetch("/supervisor/guidance", {
        method: "POST",
        body: JSON.stringify({
          targetSessionId: args.sessionId,
          content: args.content,
        }),
      });

      if (!response.ok) {
        const errorMessage = await extractError(response);

        if (response.status === 404) {
          return `Session "${args.sessionId}" not found. Use list-watched-sessions to see available sessions.`;
        }
        if (response.status === 403) {
          return `Cannot send guidance to session "${args.sessionId}": ${errorMessage}. You may not have permission to guide this session.`;
        }
        return `Failed to send guidance: ${errorMessage} (HTTP ${response.status})`;
      }

      const result = await response.json();
      return [
        `Guidance sent successfully.`,
        ``,
        `  Target session: ${args.sessionId}`,
        `  Message length: ${args.content.length} chars`,
        result.messageId ? `  Message ID:     ${result.messageId}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    } catch (error) {
      return `Failed to send guidance: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
