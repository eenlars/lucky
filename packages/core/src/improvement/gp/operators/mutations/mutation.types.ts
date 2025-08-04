/**
 * mutation types and configuration for genetic programming
 */

import type { FlowEvolutionMode } from "@/types"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import type { Genome } from "../../Genome"

export interface MutationOptions {
  parent: Genome
  generationNumber: number
  intensity?: number // 0-1, 0.3 is default (renamed from aggression)
  evolutionMode: FlowEvolutionMode // determines which mutations are available
}

export interface MutationResult {
  success: boolean
  data?: Genome
  error?: string
  usdCost: number
}

export interface MutationOperator {
  execute(
    config: WorkflowConfig,
    parent: Genome,
    intensity: number
  ): Promise<number>
}

export interface NodeMutationOperator {
  execute(config: WorkflowConfig, parent?: Genome): Promise<void>
}

export type MutationType =
  | "model"
  | "prompt"
  | "tool"
  | "structure"
  | "addNode"
  | "deleteNode"
  | "cultural"

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
    type: "cultural",
    weight: 0.15,
    description: "Cultural improvement via unified approach",
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
 * Get available mutations based on evolution mode
 */
export function getEvolutionMutations(
  evolutionMode: FlowEvolutionMode
): MutationType[] {
  switch (evolutionMode) {
    case "cultural":
      return ["cultural"]
    case "GP":
      return ["model", "prompt", "tool", "structure", "addNode", "deleteNode"]
    default:
      return []
  }
}

export const INTENSITY_LEVELS = {
  minimal: { threshold: 0.3, description: "Conservative changes" },
  moderate: { threshold: 0.6, description: "Balanced modifications" },
  extreme: { threshold: 1.0, description: "Aggressive transformations" },
} as const

export type IntensityLevel = keyof typeof INTENSITY_LEVELS
