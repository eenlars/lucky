"use client"

import { logException } from "@/lib/error-logger"
import { showToast } from "@/lib/toast-utils"
import { extractFetchError } from "@/lib/utils/extract-fetch-error"
import type { Database } from "@lucky/shared/client"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]

export interface EvolutionRunWithStats extends Tables<"EvolutionRun"> {
  total_invocations?: number
  successful_invocations?: number
  generation_count?: number
  avg_accuracy_delta?: number | null
  config: {
    mode?: string
    [key: string]: any
  }
}

type SortDirection = "asc" | "desc"

type EvolutionRunsState = {
  evolutionRuns: EvolutionRunWithStats[]
  loadedRuns: EvolutionRunWithStats[]
  hasMore: boolean
  loading: boolean
  error: string | null
  cachedRunsById: Record<string, EvolutionRunWithStats>

  // filters and controls
  limit: number
  hideEmptyRuns: boolean
  sortField: keyof EvolutionRunWithStats | null
  sortDirection: SortDirection
  searchTerm: string
  statusFilter: string
  modeFilter: string
  dateFilter: string

  // actions
  setSearchTerm: (v: string) => void
  setStatusFilter: (v: string) => void
  setModeFilter: (v: string) => void
  setDateFilter: (v: string) => void
  setHideEmptyRuns: (v: boolean) => void
  setLimit: (v: number) => void
  setSortField: (field: keyof EvolutionRunWithStats | null) => void
  setSortDirection: (dir: SortDirection) => void

  clearFilters: () => void
  fetchRuns: (opts?: { showLoading?: boolean; reset?: boolean }) => Promise<void>
}

export const useEvolutionRunsStore = create<EvolutionRunsState>()(
  persist(
    (set, get) => ({
      evolutionRuns: [],
      loadedRuns: [],
      hasMore: true,
      loading: false,
      error: null,
      cachedRunsById: {},

      // defaults
      limit: 15,
      hideEmptyRuns: false,
      sortField: null,
      sortDirection: "desc",
      searchTerm: "",
      statusFilter: "all",
      modeFilter: "all",
      dateFilter: "all",

      setSearchTerm: v => set({ searchTerm: v }),
      setStatusFilter: v => set({ statusFilter: v }),
      setModeFilter: v => set({ modeFilter: v }),
      setDateFilter: v => set({ dateFilter: v }),
      setHideEmptyRuns: v => set({ hideEmptyRuns: v }),
      setLimit: v => set({ limit: v }),
      setSortField: field => set({ sortField: field }),
      setSortDirection: dir => set({ sortDirection: dir }),

      clearFilters: () =>
        set({
          searchTerm: "",
          statusFilter: "all",
          modeFilter: "all",
          dateFilter: "all",
          hideEmptyRuns: false,
          sortField: null,
          sortDirection: "desc",
        }),

      fetchRuns: async opts => {
        const { showLoading = true, reset = false } = opts ?? {}

        if (showLoading) set({ loading: true })
        set({ error: null })

        try {
          // Prefill from cache on reset for instant UI
          if (reset) {
            const { cachedRunsById, statusFilter, modeFilter, searchTerm, dateFilter, hideEmptyRuns } = get()

            const cachedList = Object.values(cachedRunsById).filter(run => {
              // Always exclude runs with no generations (mirrors API)
              if (!run || (run.generation_count ?? 0) === 0) return false

              if (hideEmptyRuns) {
                const hasInvocations = !!run.total_invocations && run.total_invocations > 0
                const hasGenerations = (run.generation_count ?? 0) > 0
                if (!hasInvocations && !hasGenerations) return false
              }

              if (statusFilter !== "all" && run.status !== statusFilter) return false
              // evolution_type filter
              if (modeFilter !== "all") {
                const normalized = modeFilter.toLowerCase()
                if (run.evolution_type?.toLowerCase() !== normalized) return false
              }

              // date filter
              if (dateFilter !== "all") {
                const runDate = new Date(run.start_time)
                const now = new Date()
                const daysDiff = (now.getTime() - runDate.getTime()) / (1000 * 60 * 60 * 24)
                if (
                  (dateFilter === "today" && daysDiff > 1) ||
                  (dateFilter === "week" && daysDiff > 7) ||
                  (dateFilter === "month" && daysDiff > 30)
                ) {
                  return false
                }
              }

              if (searchTerm) {
                const s = searchTerm.toLowerCase()
                const goal = (run.goal_text || "").toLowerCase()
                const id = (run.run_id || "").toLowerCase()
                if (!goal.includes(s) && !id.includes(s)) return false
              }
              return true
            })

            set({ loadedRuns: cachedList, evolutionRuns: cachedList })
          }

          // Clean up stale runs first via API
          const cleanupResponse = await fetch("/api/evolution-runs/cleanup", {
            method: "POST",
          })
          if (cleanupResponse.ok) {
            const cleanupData = await cleanupResponse.json()
            if (cleanupData.cleaned > 0) {
              showToast.info.processing(`Cleaned up ${cleanupData.cleaned} stale evolution runs`)
            }
          }

          const { loadedRuns, limit, statusFilter, modeFilter, searchTerm, dateFilter, hideEmptyRuns } = get()

          const currentLoadedRuns = reset ? [] : loadedRuns
          const offset = currentLoadedRuns.length

          const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
            status: statusFilter,
            mode: modeFilter,
            search: searchTerm,
            dateFilter: dateFilter,
            hideEmpty: String(hideEmptyRuns),
          })

          const response = await fetch(`/api/evolution-runs?${params}`)
          if (!response.ok) {
            const errorDetails = await extractFetchError(response)
            throw new Error(errorDetails)
          }

          const data: EvolutionRunWithStats[] = await response.json()

          // Cache older-than-2-days runs in persisted storage
          const twoDaysMs = 2 * 24 * 60 * 60 * 1000
          const now = Date.now()
          const cacheable = data.filter(run => {
            const started = new Date(run.start_time).getTime()
            return now - started > twoDaysMs
          })
          if (cacheable.length > 0) {
            set(s => {
              const next = { ...s.cachedRunsById }
              for (const r of cacheable) next[r.run_id] = r
              return { cachedRunsById: next }
            })
          }

          // Use server data for the displayed list (do not merge cached items here)
          if (reset) {
            set({ loadedRuns: data, evolutionRuns: data })
          } else {
            const newRuns = [...currentLoadedRuns, ...data]
            // De-dupe by run_id while preserving last occurrence
            const uniqueMap = new Map<string, EvolutionRunWithStats>()
            for (const r of newRuns) uniqueMap.set(r.run_id, r)
            const uniqueList = Array.from(uniqueMap.values())
            set({ loadedRuns: uniqueList, evolutionRuns: uniqueList })
          }

          set({ hasMore: data.length === get().limit })
        } catch (err) {
          logException(err, {
            location: "/store/evolution-runs",
          })
          const errorMessage = err instanceof Error ? err.message : "Failed to fetch evolution runs"
          set({ error: errorMessage })
          showToast.error.generic(errorMessage)
          console.error("Error fetching evolution runs:", err)
        } finally {
          if (showLoading) set({ loading: false })
        }
      },
    }),
    {
      name: "evolution-runs/v2",
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({
        cachedRunsById: s.cachedRunsById,
      }),
    },
  ),
)
