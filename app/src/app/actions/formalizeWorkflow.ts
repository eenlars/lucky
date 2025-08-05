"use server"

import type { RS } from "@core/utils/types"
import { formalizeWorkflow } from "@core/workflow/actions/generate/formalizeWorkflow"
import type {
  AfterGenerationOptions,
  GenerationOptions,
} from "@core/workflow/actions/generate/generateWF.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

export async function formalizeWorkflowAction(
  prompt: string,
  options: GenerationOptions & AfterGenerationOptions
): Promise<RS<WorkflowConfig>> {
  return await formalizeWorkflow(prompt, options)
}
