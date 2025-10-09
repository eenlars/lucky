import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { create } from "zustand"

interface EvolutionUIStore {
  // Expansion states
  expandedGenerations: Set<string>
  expandedStructures: Set<string>
  showGraph: boolean

  // DSL Modal state
  dslModalOpen: boolean
  currentDsl: WorkflowConfig | null

  // Actions
  toggleGeneration: (generationId: string) => void
  toggleStructure: (structureHash: string) => void
  setShowGraph: (show: boolean) => void
  openDslModal: (dsl: WorkflowConfig) => void
  closeDslModal: () => void
  reset: () => void
}

const initialState = {
  expandedGenerations: new Set<string>(),
  expandedStructures: new Set<string>(),
  showGraph: true,
  dslModalOpen: false,
  currentDsl: null,
}

export const useEvolutionUIStore = create<EvolutionUIStore>(set => ({
  ...initialState,

  toggleGeneration: (generationId: string) =>
    set(state => {
      const newExpanded = new Set(state.expandedGenerations)
      if (newExpanded.has(generationId)) {
        newExpanded.delete(generationId)
      } else {
        newExpanded.add(generationId)
      }
      return { expandedGenerations: newExpanded }
    }),

  toggleStructure: (structureHash: string) =>
    set(state => {
      const newExpanded = new Set(state.expandedStructures)
      if (newExpanded.has(structureHash)) {
        newExpanded.delete(structureHash)
      } else {
        newExpanded.add(structureHash)
      }
      return { expandedStructures: newExpanded }
    }),

  setShowGraph: (show: boolean) => set({ showGraph: show }),

  openDslModal: (dsl: WorkflowConfig) =>
    set({
      dslModalOpen: true,
      currentDsl: dsl,
    }),

  closeDslModal: () =>
    set({
      dslModalOpen: false,
      currentDsl: null,
    }),

  reset: () => set(initialState),
}))
