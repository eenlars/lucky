/**
 * @deprecated Use MutationCoordinator from ./mutations/index.ts instead
 * Legacy mutations file - kept for backward compatibility
 *
 * This file provides a backward-compatible interface to the new MutationCoordinator system.
 * The old 'aggression' parameter is mapped to the new 'intensity' parameter automatically.
 *
 * Migration path:
 * - Replace calls to Mutations.mutateWorkflowGenome() with MutationCoordinator.mutateWorkflowGenome()
 * - Update parameter names from 'aggression' to 'intensity' in calling code
 * - Remove dependency on this legacy wrapper once migration is complete
 *
 * TODO: Schedule removal of this legacy interface after migration period
 * TODO: Add deprecation warnings in logs when this interface is used
 * TODO: Create migration script to update calling code automatically
 */

import type { RS } from "@lucky/shared"
import type { Genome } from "../Genome"
import { MutationCoordinator } from "./mutations/index"
import type { MutationOptions as CanonicalMutationOptions } from "./mutations/mutation.types"

// Legacy interface with old terminology for backward compatibility.
// Keep shape aligned with canonical MutationOptions, but allow `aggression` alias.
// TODO: remove this once all code is migrated to MutationCoordinator
export interface MutationOptions extends Omit<CanonicalMutationOptions, "intensity"> {
  /** @deprecated Use `intensity` instead */
  aggression?: number
}

export class Mutations {
  /**
   * @deprecated Use MutationCoordinator.mutateWorkflowGenome instead
   * Enhanced mutation for WorkflowGenome following pseudocode specification
   *
   * TODO: add deprecation warning when this method is called
   * TODO: track usage metrics to determine when safe to remove
   */
  static async mutateWorkflowGenome(options: MutationOptions): Promise<RS<Genome>> {
    // Convert legacy aggression parameter to new intensity parameter
    const { parent, generationNumber, aggression, evolutionMode } = options

    // TODO: add logging warning about deprecated interface usage
    return MutationCoordinator.mutateWorkflowGenome({
      parent,
      generationNumber,
      intensity: aggression, // Map old parameter to new one
      evolutionMode,
    })
  }
}
