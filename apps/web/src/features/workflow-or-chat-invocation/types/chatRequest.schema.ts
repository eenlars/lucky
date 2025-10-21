import { z } from "zod"

/**
 * ==========================
 * Validation / Types
 * ==========================
 */
export const ChatRequestSchema = z
  .object({
    messages: z
      .array(z.any())
      .min(1, "At least one message is required")
      .max(100, "Too many messages in conversation")
      .refine(
        msgs =>
          msgs.every(
            msg =>
              msg &&
              typeof msg === "object" &&
              typeof msg.id === "string" &&
              typeof msg.role === "string" &&
              Array.isArray(msg.parts),
          ),
        { message: "Invalid message format" },
      ),
    nodeId: z.string().min(1, "nodeId cannot be empty").max(200),
    gatewayModelId: z.string().max(200).optional(),
    systemPrompt: z.string().max(10000, "System prompt is too long").optional(),

    //these two are sent by the api i think
    trigger: z.string().optional(),
    id: z.string().optional(),
  })
  .strict()

export type ChatRequest = z.infer<typeof ChatRequestSchema>

export type ProviderSettingsRow = {
  gateway: string | null
  enabled_models: unknown
  is_enabled: boolean | null
}
