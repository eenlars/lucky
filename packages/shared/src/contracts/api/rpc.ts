import { z } from "zod"
import { EvaluationInputSchema } from "../ingestion"

export const workflowAPIV1InvokeRequestSchema = z.object({
  workflowVersionId: z.string().min(1),
  evalInput: EvaluationInputSchema,
})
