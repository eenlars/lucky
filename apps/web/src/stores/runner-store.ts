import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type EditorMode = "create-new" | "editing" | "running" | "finished"

export type RunnerState = {
  editorMode: EditorMode
  isExecuting: boolean
  logs: string[]
  executionResults: any | null
}

export type RunnerActions = {
  setEditorMode: (mode: EditorMode) => void
  setExecuting: (executing: boolean) => void
  addLog: (message: string) => void
  clearLogs: () => void
  setExecutionResults: (results: any) => void
  reset: () => void
}

export type RunnerStore = RunnerState & RunnerActions

const initialState: RunnerState = {
  editorMode: "editing",
  isExecuting: false,
  logs: [],
  executionResults: null,
}

export const useRunnerStore = create<RunnerStore>()(
  persist(
    set => ({
      ...initialState,

      setEditorMode: mode => set({ editorMode: mode }),
      setExecuting: executing => set({ isExecuting: executing }),
      addLog: message => set(state => ({ logs: [...state.logs, message] })),
      clearLogs: () => set({ logs: [] }),
      setExecutionResults: results => set({ executionResults: results }),
      reset: () => set(initialState),
    }),
    {
      name: "runner-state",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
