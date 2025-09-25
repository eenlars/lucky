import type { Payload } from "@core/messages/MessagePayload"

export function buildReplyMessage(params: { isOrchestrator: boolean; content: string }): Payload {
  const { isOrchestrator, content } = params

  return isOrchestrator
    ? {
        kind: "delegation",
        berichten: [{ type: "text", text: `delegated task: ${content}` }],
      }
    : { kind: "result", berichten: [{ type: "text", text: content }] }
}
