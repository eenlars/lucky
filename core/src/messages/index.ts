import { processModelResponse } from "@core/messages/api/processResponse"
import { sendAI } from "@core/messages/api/sendAI"
import { buildSimpleMessage } from "@core/messages/create/buildSimpleMessage"
import { HandoffMessageHandler } from "@core/messages/handoffs/HandoffMessageHandler"

export const Messages = {
  buildSimpleMessage,
  processModelResponse,
  sendAI,
  HandoffMessageHandler,
}
