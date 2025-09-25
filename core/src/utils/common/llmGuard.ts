import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { getDefaultModels } from "@runtime/settings/models"
import { z } from "zod"

export interface GuardResult {
  isValid: boolean
  reason?: string
}

const GuardResponseSchema = z.object({
  status: z.enum(["OK", "ERROR"]),
  reason: z.string().optional(),
})

export const llmGuard = async (input: string, guardText: string): Promise<GuardResult> => {
  const response = await sendAI({
    messages: [
      {
        role: "system",
        content: `
      You are a guard.
      You are given an input. If the input does not conform to the guardText (i.e., it violates the rules in guardText), respond with status "ERROR" and provide a reason explaining why it failed.
      If it does conform, respond with status "OK".

      The guardText is:
      ${guardText}
      `,
      },
      { role: "user", content: input },
    ],
    model: getDefaultModels().summary,
    mode: "structured",
    schema: GuardResponseSchema,
  })

  if (!response.success || !response.data) {
    return { isValid: true } // the call failed, so we assume it is correct. todo :: handle this better.
  }

  if (response.data.status === "ERROR") {
    return {
      isValid: false,
      reason: response.data.reason || "Content does not conform to guard rules",
    }
  }

  return { isValid: true }
}
