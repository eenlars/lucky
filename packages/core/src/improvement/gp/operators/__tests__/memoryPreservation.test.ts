/**
 * tests for memory preservation in genetic operations
 */

import { describe, expect, it } from "vitest"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import { MemoryPreservation } from "../memoryPreservation"
import { createDummyGenome } from "../../resources/debug/dummyGenome"

describe("MemoryPreservation", () => {
  const createTestGenome = (
    nodeMemories: Record<string, Record<string, string>>
  ) => {
    const genome = createDummyGenome([], {
      runId: "test-run",
      generationId: "test-gen",
      generationNumber: 1,
    })

    // simulate genome with memory
    const mockMemory = nodeMemories
    genome.getMemory = () => mockMemory
    genome.getWorkflowConfig = () => ({
      nodes: Object.keys(nodeMemories).map((nodeId) => ({
        nodeId,
        description: `Description for ${nodeId}`,
        systemPrompt: `System prompt for ${nodeId}`,
        modelName: "gpt-4" as any,
        mcpTools: [],
        codeTools: [],
        handOffs: [],
        memory: nodeMemories[nodeId],
      })),
      entryNodeId: Object.keys(nodeMemories)[0] || "node1",
      memory: { workflowLevel: "value" },
    })

    return genome
  }

  describe("preserveMutationMemory", () => {
    it("should preserve node memories from parent", () => {
      const parent = createTestGenome({
        node1: { key1: "value1", key2: "value2" },
        node2: { key3: "value3" },
      })

      const offspring: WorkflowConfig = {
        nodes: [
          {
            nodeId: "node1",
            description: "Updated node",
            systemPrompt: "Updated prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
          {
            nodeId: "node2",
            description: "Another node",
            systemPrompt: "Another prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "node1",
      }

      MemoryPreservation.preserveMutationMemory(offspring, parent)

      expect(offspring.nodes[0].memory).toEqual({
        key1: "value1",
        key2: "value2",
      })
      expect(offspring.nodes[1].memory).toEqual({ key3: "value3" })
      expect(offspring.memory).toEqual({ workflowLevel: "value" })
    })

    it("should handle offspring with new nodes", () => {
      const parent = createTestGenome({
        node1: { key1: "value1" },
      })

      const offspring: WorkflowConfig = {
        nodes: [
          {
            nodeId: "node1",
            description: "Original node",
            systemPrompt: "Original prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
          {
            nodeId: "newNode",
            description: "New node",
            systemPrompt: "New node prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "node1",
      }

      MemoryPreservation.preserveMutationMemory(offspring, parent)

      expect(offspring.nodes[0].memory).toEqual({ key1: "value1" })
      // New nodes may or may not inherit memory depending on similarity
      // This is acceptable behavior
    })
  })

  describe("preserveCrossoverMemory", () => {
    it("should merge memories from both parents with parent1 precedence", () => {
      const parent1 = createTestGenome({
        node1: { key1: "parent1_value1", key2: "parent1_value2" },
        node2: { key3: "parent1_value3" },
      })

      const parent2 = createTestGenome({
        node1: { key1: "parent2_value1", key4: "parent2_value4" },
        node3: { key5: "parent2_value5" },
      })

      const offspring: WorkflowConfig = {
        nodes: [
          {
            nodeId: "node1",
            description: "Crossover node",
            systemPrompt: "Crossover prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
          {
            nodeId: "node2",
            description: "Another node",
            systemPrompt: "Another prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
          {
            nodeId: "node3",
            description: "Third node",
            systemPrompt: "Third prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "node1",
      }

      MemoryPreservation.preserveCrossoverMemory(offspring, parent1, parent2)

      // node1 should have merged memory with parent1 precedence
      expect(offspring.nodes[0].memory).toEqual({
        key1: "parent1_value1", // parent1 takes precedence
        key2: "parent1_value2",
        key4: "parent2_value4", // unique to parent2
      })

      // node2 should have parent1 memory
      expect(offspring.nodes[1].memory).toEqual({ key3: "parent1_value3" })

      // node3 should have parent2 memory
      expect(offspring.nodes[2].memory).toEqual({ key5: "parent2_value5" })
    })
  })

  describe("memory protection enforcement", () => {
    it("should validate that no memories are lost", () => {
      const parent1 = createTestGenome({
        node1: { key1: "value1", key2: "value2" },
        node2: { key3: "value3" },
      })

      const parent2 = createTestGenome({
        node1: { key4: "value4" },
        node3: { key5: "value5" },
      })

      const validOffspring: WorkflowConfig = {
        nodes: [
          {
            nodeId: "node1",
            description: "Valid node",
            systemPrompt: "Valid prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
            memory: { key1: "value1", key2: "value2", key4: "value4" },
          },
          {
            nodeId: "node2",
            description: "Another valid node",
            systemPrompt: "Another prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
            memory: { key3: "value3" },
          },
          {
            nodeId: "node3",
            description: "Third valid node",
            systemPrompt: "Third prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
            memory: { key5: "value5" },
          },
        ],
        entryNodeId: "node1",
        memory: { workflowLevel: "value" }, // include workflow-level memory
      }

      const validation = MemoryPreservation.validateMemoryPreservation(
        validOffspring,
        [parent1, parent2]
      )

      expect(validation.isValid).toBe(true)
      expect(validation.missingMemories).toHaveLength(0)
    })

    it("should detect missing memories", () => {
      const parent = createTestGenome({
        node1: { key1: "value1", key2: "value2" },
        node2: { key3: "value3" },
      })

      const invalidOffspring: WorkflowConfig = {
        nodes: [
          {
            nodeId: "node1",
            description: "Invalid node",
            systemPrompt: "Invalid prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
            memory: { key1: "value1" }, // missing key2
          },
          {
            nodeId: "node2",
            description: "Another invalid node",
            systemPrompt: "Another prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
            // missing memory entirely
          },
        ],
        entryNodeId: "node1",
      }

      const validation = MemoryPreservation.validateMemoryPreservation(
        invalidOffspring,
        [parent]
      )

      expect(validation.isValid).toBe(false)
      expect(validation.missingMemories).toContain(
        "node 'node1' memory key 'key2' lost"
      )
      expect(validation.missingMemories).toContain(
        "node 'node2' memory completely lost"
      )
    })

    it("should throw error when enforcing memory preservation fails", () => {
      // fails because: Memory preservation violation in mutation: workflow-level memory completely missing, node 'node1' memory completely lost
      const parent = createTestGenome({
        node1: { important: "data" },
      })

      const invalidOffspring: WorkflowConfig = {
        nodes: [
          {
            nodeId: "node1",
            description: "Node without memory",
            systemPrompt: "Prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
            // memory is missing!
          },
        ],
        entryNodeId: "node1",
      }

      expect(() => {
        MemoryPreservation.enforceMemoryPreservation(
          invalidOffspring,
          [parent],
          "mutation"
        )
      }).toThrow("Memory preservation violation in mutation")
    })

    it("should not throw when all memories are preserved", () => {
      const parent = createTestGenome({
        node1: { important: "data" },
      })

      const validOffspring: WorkflowConfig = {
        nodes: [
          {
            nodeId: "node1",
            description: "Node with preserved memory",
            systemPrompt: "Prompt",
            modelName: "gpt-4" as any,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
            memory: { important: "data" },
          },
        ],
        entryNodeId: "node1",
        memory: { workflowLevel: "value" }, // include workflow-level memory
      }

      expect(() => {
        MemoryPreservation.enforceMemoryPreservation(
          validOffspring,
          [parent],
          "mutation"
        )
      }).not.toThrow()
    })
  })
})
