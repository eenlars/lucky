/**
 * memory preservation utilities for genetic operations
 */

import { lgg } from "@/core/utils/logging/Logger"
import { CONFIG } from "@/runtime/settings/constants"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import type { Genome } from "../Genome"

export class MemoryPreservation {
  private static verbose = CONFIG.logging.override.GP

  /**
   * preserve parent memories in crossover offspring
   * merges memories from both parents, with parent1 taking precedence for conflicts
   * CRITICAL: memories are NEVER deleted, only transferred and merged
   */
  static preserveCrossoverMemory(
    offspring: WorkflowConfig,
    parent1: Genome,
    parent2: Genome
  ): void {
    const parent1Memory = parent1.getMemory()
    const parent2Memory = parent2.getMemory()

    // preserve workflow-level memory
    if (
      parent1.getWorkflowConfig().memory ||
      parent2.getWorkflowConfig().memory
    ) {
      offspring.memory = {
        ...parent2.getWorkflowConfig().memory,
        ...parent1.getWorkflowConfig().memory, // parent1 takes precedence
      }
    }

    // preserve node-level memories
    for (const node of offspring.nodes) {
      const parent1NodeMemory = parent1Memory[node.nodeId]
      const parent2NodeMemory = parent2Memory[node.nodeId]

      if (parent1NodeMemory || parent2NodeMemory) {
        node.memory = {
          ...parent2NodeMemory,
          ...parent1NodeMemory, // parent1 takes precedence
        }

        lgg.onlyIf(
          MemoryPreservation.verbose,
          `Preserved memory for node ${node.nodeId}:`,
          node.memory
        )
      }
    }

    // for new nodes that don't exist in parents, try to find similar nodes
    for (const node of offspring.nodes) {
      if (!parent1Memory[node.nodeId] && !parent2Memory[node.nodeId]) {
        const similarNodeMemory = this.findSimilarNodeMemory(
          node,
          parent1Memory,
          parent2Memory
        )
        if (similarNodeMemory) {
          node.memory = { ...similarNodeMemory }
          lgg.onlyIf(
            MemoryPreservation.verbose,
            `Inherited similar memory for new node ${node.nodeId}:`,
            node.memory
          )
        }
      }
    }
  }

  /**
   * preserve parent memory in mutation offspring
   * copies all memories from parent, maintaining continuity
   * CRITICAL: ALL parent memories are preserved, NEVER deleted
   */
  static preserveMutationMemory(
    offspring: WorkflowConfig,
    parent: Genome
  ): void {
    const parentMemory = parent.getMemory()

    // preserve workflow-level memory
    if (parent.getWorkflowConfig().memory) {
      offspring.memory = { ...parent.getWorkflowConfig().memory }
    }

    // preserve node-level memories
    for (const node of offspring.nodes) {
      const parentNodeMemory = parentMemory[node.nodeId]
      if (parentNodeMemory) {
        node.memory = { ...parentNodeMemory }

        lgg.onlyIf(
          MemoryPreservation.verbose,
          `Preserved memory for mutated node ${node.nodeId}:`,
          node.memory
        )
      }
    }

    // for newly added nodes, try to inherit from similar nodes
    for (const node of offspring.nodes) {
      if (!parentMemory[node.nodeId]) {
        const similarNodeMemory = this.findSimilarNodeMemory(node, parentMemory)
        if (similarNodeMemory) {
          node.memory = { ...similarNodeMemory }
          lgg.onlyIf(
            MemoryPreservation.verbose,
            `Inherited memory for new mutated node ${node.nodeId}:`,
            node.memory
          )
        }
      }
    }
  }

  /**
   * find memory from similar nodes based on system prompt similarity
   */
  private static findSimilarNodeMemory(
    targetNode: { nodeId: string; systemPrompt: string },
    ...memorySources: Record<string, Record<string, string>>[]
  ): Record<string, string> | null {
    const allMemories = memorySources.reduce(
      (acc, source) => ({ ...acc, ...source }),
      {}
    )

    // simple heuristic: find node with most similar system prompt
    let bestMatch: {
      nodeId: string
      similarity: number
      memory: Record<string, string>
    } | null = null

    for (const [nodeId, memory] of Object.entries(allMemories)) {
      if (memory && Object.keys(memory).length > 0) {
        // calculate similarity based on common words (simple heuristic)
        const similarity = this.calculatePromptSimilarity(
          targetNode.systemPrompt,
          nodeId // we don't have access to the original prompt, using nodeId as proxy
        )

        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { nodeId, similarity, memory }
        }
      }
    }

    return bestMatch && bestMatch.similarity > 0.3 ? bestMatch.memory : null
  }

  /**
   * memory protection guard - ensures no memories are lost during operations
   * validates that all parent memories are preserved in offspring
   */
  static validateMemoryPreservation(
    offspring: WorkflowConfig,
    parents: Genome[]
  ): { isValid: boolean; missingMemories: string[] } {
    const missingMemories: string[] = []

    // collect all parent memories
    const allParentMemories: Record<string, Record<string, string>> = {}
    for (const parent of parents) {
      const parentMemory = parent.getMemory()
      Object.assign(allParentMemories, parentMemory)
    }

    // check workflow-level memory preservation
    for (const parent of parents) {
      const parentWorkflowMemory = parent.getWorkflowConfig().memory
      if (
        parentWorkflowMemory &&
        Object.keys(parentWorkflowMemory).length > 0
      ) {
        if (!offspring.memory) {
          missingMemories.push("workflow-level memory completely missing")
        } else {
          for (const [key, value] of Object.entries(parentWorkflowMemory)) {
            if (!(key in offspring.memory)) {
              missingMemories.push(`workflow memory key '${key}' lost`)
            }
          }
        }
      }
    }

    // check node-level memory preservation
    for (const [nodeId, parentNodeMemory] of Object.entries(
      allParentMemories
    )) {
      if (parentNodeMemory && Object.keys(parentNodeMemory).length > 0) {
        const offspringNode = offspring.nodes.find((n) => n.nodeId === nodeId)
        if (offspringNode) {
          if (!offspringNode.memory) {
            missingMemories.push(`node '${nodeId}' memory completely lost`)
          } else {
            for (const [key, value] of Object.entries(parentNodeMemory)) {
              if (!(key in offspringNode.memory)) {
                missingMemories.push(
                  `node '${nodeId}' memory key '${key}' lost`
                )
              }
            }
          }
        }
        // Note: if node itself is deleted, that's acceptable, but we log it
      }
    }

    return {
      isValid: missingMemories.length === 0,
      missingMemories,
    }
  }

  /**
   * enforced memory preservation - throws error if memories are lost
   */
  static enforceMemoryPreservation(
    offspring: WorkflowConfig,
    parents: Genome[],
    operationType: "crossover" | "mutation"
  ): void {
    const validation = this.validateMemoryPreservation(offspring, parents)

    if (!validation.isValid) {
      const errorMsg = `Memory preservation violation in ${operationType}: ${validation.missingMemories.join(", ")}`
      lgg.error(errorMsg)
      throw new Error(errorMsg)
    }

    lgg.onlyIf(
      MemoryPreservation.verbose,
      `Memory preservation validated for ${operationType} - all parent memories preserved`
    )
  }

  /**
   * simple prompt similarity calculation
   */
  private static calculatePromptSimilarity(
    prompt1: string,
    prompt2: string
  ): number {
    const words1 = new Set(prompt1.toLowerCase().split(/\s+/))
    const words2 = new Set(prompt2.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter((x) => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size // jaccard similarity
  }
}
