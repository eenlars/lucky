import { processModelResponse } from "@/core/messages/api/processResponse"
import { sendAI } from "@/core/messages/api/sendAI"
import { buildSimpleMessage } from "@/core/messages/create/buildSimpleMessage"

export const Messages = {
  buildSimpleMessage,
  processModelResponse,
  sendAI,
}
