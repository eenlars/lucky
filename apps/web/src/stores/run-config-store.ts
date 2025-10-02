"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { InvokeWorkflowResult } from "@lucky/core/workflow/runner/types"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"

export type CaseRow = {
  id: string
  input: string
  expected: string
}

export type RunOptions = {
  concurrency: number
  maxRetries?: number
  timeoutMs?: number
}

export type ResultsById = Record<string, InvokeWorkflowResult | { error: string }>

type RunConfigState = {
  datasetName?: string
  datasetId?: string
  goal: string
  prompt: string
  cases: CaseRow[]
  resultsById: ResultsById
  busyIds: Set<string>
  options: RunOptions

  // CRUD
  addCase: (row?: Partial<CaseRow>) => void
  updateCase: (id: string, patch: Partial<CaseRow>) => void
  removeCase: (id: string) => void
  importCases: (rows: CaseRow[]) => void
  exportCases: () => CaseRow[]
  clearResults: () => void
  loadDataset: (datasetId: string) => Promise<void>

  // Meta
  setGoal: (goal: string) => void
  setPrompt: (prompt: string) => void
  setDatasetName: (name?: string) => void
  setDatasetId: (id?: string) => void
  setOptions: (opts: Partial<RunOptions>) => void

  // Running
  runOne: (cfg: WorkflowConfig, row: CaseRow, goalOverride?: string, signal?: AbortSignal) => Promise<void>
  runAll: (cfg: WorkflowConfig) => Promise<void>
  cancel: (id: string) => void
  cancelAll: () => void
}

// Non-persisted per-row controllers (kept in memory only)
const controllers = new Map<string, AbortController>()

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `case_${Math.random().toString(36).slice(2)}`
}

export const useRunConfigStore = create<RunConfigState>()(
  persist(
    (set, get) => ({
      datasetName: undefined,
      datasetId: undefined,
      goal: "",
      prompt: "",
      cases: [],
      resultsById: {},
      busyIds: new Set<string>(),
      // Increase default timeout to accommodate longer runs (10 minutes)
      options: { concurrency: 2, timeoutMs: 600000 },

      addCase: row =>
        set(s => ({
          cases: [
            ...s.cases,
            {
              id: row?.id || newId(),
              input: row?.input || "",
              expected: row?.expected || "",
            },
          ],
        })),

      updateCase: (id, patch) =>
        set(s => {
          let changed = false
          const nextCases = s.cases.map(x => {
            if (x.id !== id) return x
            const merged = { ...x, ...patch }
            if (merged.input !== x.input || merged.expected !== x.expected) {
              changed = true
            }
            return merged
          })
          if (!changed) return s
          return { cases: nextCases }
        }),

      removeCase: id =>
        set(s => {
          const next: ResultsById = { ...s.resultsById }
          delete next[id]
          const busy = new Set(s.busyIds)
          busy.delete(id)
          controllers.delete(id)
          return {
            cases: s.cases.filter(x => x.id !== id),
            resultsById: next,
            busyIds: busy,
          }
        }),

      importCases: rows => set({ cases: rows }),
      exportCases: () => get().cases,
      clearResults: () => set({ resultsById: {} }),

      loadDataset: async datasetId => {
        // Handle clear selection
        if (!datasetId) {
          set({
            cases: [],
            datasetId: undefined,
            datasetName: undefined,
          })
          return
        }

        try {
          const response = await fetch(`/api/ingestions/${datasetId}`)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const data = await response.json()

          if (data.records && Array.isArray(data.records)) {
            const cases: CaseRow[] = data.records
              .filter(
                (
                  record: unknown,
                ): record is {
                  dataset_record_id?: string
                  workflow_input: unknown
                  ground_truth: unknown
                } =>
                  typeof record === "object" &&
                  record !== null &&
                  "workflow_input" in record &&
                  "ground_truth" in record &&
                  record.workflow_input !== null &&
                  record.workflow_input !== undefined &&
                  record.ground_truth !== null &&
                  record.ground_truth !== undefined,
              )
              .map((record: { dataset_record_id?: string; workflow_input: unknown; ground_truth: unknown }) => ({
                id: record.dataset_record_id || newId(),
                input: String(record.workflow_input || ""),
                expected: String(record.ground_truth || ""),
              }))

            set({
              cases,
              datasetId,
              datasetName: data.name,
              goal: data.description || get().goal, // Don't override existing goal if none provided
            })
          } else {
            // No records found, but dataset exists
            set({
              cases: [],
              datasetId,
              datasetName: data.name,
              goal: data.description || get().goal,
            })
          }
        } catch (error) {
          console.error("Failed to load dataset:", error)
          // Reset state on error
          set({
            cases: [],
            datasetId: undefined,
            datasetName: undefined,
          })
          throw error // Re-throw so UI can handle it
        }
      },

      setGoal: goal => set({ goal }),
      setPrompt: prompt => set({ prompt }),
      setDatasetName: name => set({ datasetName: name }),
      setDatasetId: id => set({ datasetId: id }),
      setOptions: opts => set(s => ({ options: { ...s.options, ...opts } })),

      runOne: async (cfg, row, goalOverride, externalSignal) => {
        // mark busy
        set(s => ({ busyIds: new Set(s.busyIds).add(row.id) }))
        const controller = new AbortController()
        controllers.set(row.id, controller)

        const signal = externalSignal ?? controller.signal
        const { maxRetries = 0, timeoutMs = 600000 } = get().options

        // Set timeout if configured
        let timeoutId: NodeJS.Timeout | undefined
        if (timeoutMs > 0 && !externalSignal) {
          timeoutId = setTimeout(() => controller.abort(), timeoutMs)
        }

        const attemptFetch = async (retryCount = 0): Promise<void> => {
          try {
            const resp = await fetch("/api/workflow/run-many", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dslConfig: cfg,
                cases: [
                  {
                    workflowInput: row.input,
                    workflowOutput: row.expected,
                  },
                ],
                goal: (goalOverride ?? get().goal)?.trim() || undefined,
              }),
              signal,
            })

            const out = await resp.json()
            const first = out?.results?.[0]

            if (first?.success && Array.isArray(first.data) && first.data[0]) {
              const result: InvokeWorkflowResult = first.data[0]
              set(s => ({
                resultsById: {
                  ...s.resultsById,
                  [row.id]: result,
                },
              }))
            } else {
              const error = first?.error || "Failed"
              if (retryCount < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s...
                await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** retryCount, 10000)))
                return attemptFetch(retryCount + 1)
              }
              set(s => ({
                resultsById: {
                  ...s.resultsById,
                  [row.id]: { error },
                },
              }))
            }
          } catch (e: unknown) {
            const isAbort = e instanceof Error && e.name === "AbortError"
            const error = isAbort ? "Canceled" : e instanceof Error ? e.message : "Error"

            if (!isAbort && retryCount < maxRetries) {
              await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** retryCount, 10000)))
              return attemptFetch(retryCount + 1)
            }

            set(s => ({
              resultsById: {
                ...s.resultsById,
                [row.id]: { error },
              },
            }))
          }
        }

        try {
          await attemptFetch()
        } finally {
          if (timeoutId) clearTimeout(timeoutId)
          controllers.delete(row.id)
          set(s => {
            const busy = new Set(s.busyIds)
            busy.delete(row.id)
            return { busyIds: busy }
          })
        }
      },

      runAll: async cfg => {
        const { options, cases, busyIds } = get()
        const target = cases.filter(c => !busyIds.has(c.id))
        const concurrency = Math.max(1, options.concurrency || 1)

        let idx = 0
        const runNext = async () => {
          const current = idx++
          if (current >= target.length) return
          const row = target[current]
          await get().runOne(cfg, row)
          await runNext()
        }

        const workers = Array.from({ length: Math.min(concurrency, target.length) }, () => runNext())
        await Promise.all(workers)
      },

      cancel: id => {
        const c = controllers.get(id)
        if (c) c.abort()
      },

      cancelAll: () => {
        for (const c of controllers.values()) c.abort()
        controllers.clear()
      },
    }),
    {
      name: "run-config/v1",
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({
        datasetName: s.datasetName,
        goal: s.goal,
        prompt: s.prompt,
        cases: s.cases,
        resultsById: s.resultsById,
        options: s.options,
        // busyIds and controllers are intentionally not persisted
      }),
    },
  ),
)
