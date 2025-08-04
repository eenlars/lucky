/**
 * @deprecated Use MutationCoordinator from ./mutations/index.ts instead
 * Legacy mutations file - kept for backward compatibility
 */

import type { FlowEvolutionMode } from "@/types"
import type { RS } from "@/utils/types"
import type { Genome } from "../Genome"
import { MutationCoordinator } from "./mutations/index"

// Legacy interface with old terminology for backward compatibility
export interface MutationOptions {
  parent: Genome
  generationNumber: number
  aggression?: number // @deprecated Use intensity instead
  evolutionMode: FlowEvolutionMode // determines which mutations are available
}

export class Mutations {
  /**
   * @deprecated Use MutationCoordinator.mutateWorkflowGenome instead
   * Enhanced mutation for WorkflowGenome following pseudocode specification
   */
  static async mutateWorkflowGenome(
    options: MutationOptions
  ): Promise<RS<Genome>> {
    // Convert legacy aggression parameter to new intensity parameter
    const { parent, generationNumber, aggression, evolutionMode } = options

    return MutationCoordinator.mutateWorkflowGenome({
      parent,
      generationNumber,
      intensity: aggression, // Map old parameter to new one
      evolutionMode,
    })
  }
}
