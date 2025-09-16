/**
 * mutation types and configuration for genetic programming
 */

import type { FlowEvolutionMode } from "@core/types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import type { Genome } from "../../Genome"

/**
 * Options describing the context for a mutation operation.
 *
 * @property parent - The genome to mutate
 * @property generationNumber - Current generation in evolution process
 * @property intensity - Mutation strength (0-1), defaults to 0.3. Higher values increase mutation scope
 * @property evolutionMode - Determines which mutation types are available (GP vs iterative)
 */
export interface MutationOptions {
  parent: Genome
  generationNumber: number
  intensity?: number
  evolutionMode: FlowEvolutionMode
}

/**
 * Result of executing a mutation operator.
 */
export interface MutationResult {
  success: boolean
  data?: Genome
  error?: string
  usdCost: number
}

/**
 * Contract for a workflow-level mutation operator.
 */
export interface MutationOperator {
  execute(
    config: WorkflowConfig,
    parent: Genome,
    intensity: number
  ): Promise<number>
}

/**
 * Contract for a node-level mutation operator.
 */
export interface NodeMutationOperator {
  execute(config: WorkflowConfig, parent?: Genome): Promise<void>
}

/**
 * Discrete categories of mutations available to the engine.
 */
export type MutationType =
  | "model"
  | "prompt"
  | "tool"
  | "structure"
  | "addNode"
  | "deleteNode"
  | "iterative"

/**
 * Weight configuration for probabilistic selection of mutation types.
 */
export interface MutationWeight {
  type: MutationType
  weight: number
  description: string
}

export const MUTATION_WEIGHTS: MutationWeight[] = [
  {
    type: "model",
    weight: 0.22,
    description: "Change model for random node",
  },
  {
    type: "prompt",
    weight: 0.18,
    description: "Modify system prompt using LLM",
  },
  {
    type: "tool",
    weight: 0.18,
    description: "Add, remove, or move tools between nodes",
  },
  {
    type: "iterative",
    weight: 0.15,
    description: "Iterative improvement via unified approach",
  },
  {
    type: "structure",
    weight: 0.13,
    description: "Restructure workflow patterns",
  },
  {
    type: "addNode",
    weight: 0.07,
    description: "Add new specialized node",
  },
  {
    type: "deleteNode",
    weight: 0.07,
    description: "Remove leaf node",
  },
]

/**
 * Get available mutations based on evolution mode.
 *
 * @param evolutionMode - The evolution mode (GP or iterative)
 * @returns Array of mutation types available for the given mode
 *
 * @remarks
 * - Iterative mode only uses iterative mutations
 * - GP mode uses all structural and behavioral mutations
 */
export function getEvolutionMutations(
  evolutionMode: FlowEvolutionMode
): MutationType[] {
  switch (evolutionMode) {
    case "iterative":
      return ["iterative"]
    case "GP":
      return ["model", "prompt", "tool", "structure", "addNode", "deleteNode"]
    default: {
      const _exhaustiveCheck: never = evolutionMode
      void _exhaustiveCheck
      return []
    }
  }
}

export const INTENSITY_LEVELS = {
  minimal: { threshold: 0.3, description: "Conservative changes" },
  moderate: { threshold: 0.6, description: "Balanced modifications" },
  extreme: { threshold: 1.0, description: "Aggressive transformations" },
} as const

/**
 * Named intensity presets mapped to `INTENSITY_LEVELS` keys.
 */
export type IntensityLevel = keyof typeof INTENSITY_LEVELS
