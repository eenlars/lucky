/**
 * Wrapper functions for external services with caching
 */

import type { WorkflowGenome } from "@core/improvement/gp/resources/gp.types"
import type { EvolutionContext } from "@core/improvement/gp/resources/types"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import { verifyWorkflowConfig } from "@core/utils/validation/workflow"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { Genome } from "../Genome"

/**
 * Cached verification wrapper for genomes
 */
export class VerificationCache {
  private cache = new Map<string, { valid: boolean; error?: string }>()

  /**
   * Verify workflow config with cache
   */
  async verifyWithCache(
    genome: Genome
  ): Promise<{ valid: boolean; error?: string }> {
    const hash = genome.hash()

    // Check cache first
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!
    }

    try {
      // Convert genome to workflow config for verification
      const workflowConfig = genome.getWorkflowConfig()

      const { isValid, errors } = await verifyWorkflowConfig(workflowConfig, {
        throwOnError: false,
        verbose: false,
      })

      if (!isValid) {
        lgg.error("verifyWithCache: invalid workflow", errors)
        return { valid: false, error: errors.join(", ") }
      }

      const result = { valid: true, error: undefined }
      this.cache.set(hash, result)
      return result
    } catch (error) {
      const result = {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      }
      this.cache.set(hash, result)
      return result
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

export async function workflowConfigToGenome({
  workflowConfig,
  parentWorkflowVersionIds,
  evaluationInput,
  _evolutionContext,
  operation = "init",
  verboseId,
}: {
  workflowConfig: WorkflowConfig
  parentWorkflowVersionIds: string[]
  evaluationInput: EvaluationInput
  _evolutionContext: EvolutionContext
  operation?: "init" | "crossover" | "mutation" | "immigrant"
  verboseId?: string
}): Promise<RS<Genome>> {
  const workflowGenome: WorkflowGenome = {
    ...workflowConfig,
    _evolutionContext,
    parentWorkflowVersionIds,
    createdAt: new Date().toISOString(),
    evaluationResults: undefined,
  }

  if (verboseId) {
    lgg.warn("WARNING! ONLY TEST ENVIRONMENT")
    return {
      success: true,
      data: new Genome(
        workflowGenome,
        evaluationInput,
        _evolutionContext,
        verboseId
      ),
      usdCost: 0,
      error: undefined,
    }
  }
  try {
    const workflowVersionId = await Genome.createWorkflowVersion({
      genome: workflowGenome,
      evaluationInput,
      _evolutionContext,
      operation,
      parentWorkflowVersionIds,
    })
    return {
      success: true,
      data: new Genome(
        workflowGenome,
        evaluationInput,
        _evolutionContext,
        workflowVersionId
      ),
      usdCost: 0,
      error: undefined,
    }
  } catch (error) {
    lgg.error("workflowConfigToGenome: failed to create genome", error)
    return R.error(error instanceof Error ? error.message : String(error), 0)
  }
}
