import { EvaluationInputSchema } from "@lucky/shared/contracts/ingestion"
import { WorkflowConfigSchema } from "@lucky/shared/contracts/workflow"
import { z } from "zod"

const SourceVersion = z.object({ workflowVersionId: z.string().min(1) })
const SourceFilename = z.object({ filename: z.string().min(1) })
export const SourceDSL = z.object({ dslConfig: WorkflowConfigSchema }) // schema for WorkflowConfig already validated elsewhere

export const InvokeReqBody = z
  .object({
    evalInput: EvaluationInputSchema,
    validation: z.enum(["strict", "ai", "none"]).optional(),
  })
  .and(SourceVersion.or(SourceFilename).or(SourceDSL))
