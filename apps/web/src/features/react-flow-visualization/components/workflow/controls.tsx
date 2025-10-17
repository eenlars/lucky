import { Panel } from "@xyflow/react"
import { AlertCircle, Route, Terminal } from "lucide-react"
import { useEffect } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/features/react-flow-visualization/components/ui/button"
import { ErrorDetailsPanel } from "@/features/react-flow-visualization/components/workflow/error-details-panel"
import { ZoomSlider } from "@/features/react-flow-visualization/components/zoom-slider"
import { useLayout } from "@/features/react-flow-visualization/hooks/use-layout"
import { useAppStore } from "@/features/react-flow-visualization/store/store"
import { cn } from "@/lib/utils"

export function WorkflowControls() {
  const runLayout = useLayout(true)
  const { logPanelOpen, toggleLogPanel, workflowValidationErrors, errorPanelOpen, toggleErrorPanel } = useAppStore(
    useShallow(state => ({
      logPanelOpen: state.logPanelOpen,
      toggleLogPanel: state.toggleLogPanel,
      workflowValidationErrors: state.workflowValidationErrors,
      errorPanelOpen: state.errorPanelOpen,
      toggleErrorPanel: state.toggleErrorPanel,
    })),
  )

  const errorCount = workflowValidationErrors.length
  const hasErrors = errorCount > 0

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + L to organize layout
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault()
        runLayout()
      }
      // Cmd/Ctrl + ` to toggle log panel
      if ((e.metaKey || e.ctrlKey) && e.key === "`") {
        e.preventDefault()
        toggleLogPanel()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [runLayout, toggleLogPanel])

  return (
    <>
      <ErrorDetailsPanel />
      <ZoomSlider position="bottom-left" className="bg-white border border-gray-200 shadow-md" />
      <Panel
        position="bottom-right"
        className="bg-white border border-gray-200 text-foreground rounded-lg shadow-md p-1 flex gap-1"
      >
        {hasErrors && (
          <div className="relative">
            <Button
              onClick={toggleErrorPanel}
              variant="ghost"
              className={cn("hover:bg-gray-100 rounded-lg relative", errorPanelOpen ? "bg-gray-100" : "")}
              size="sm"
              title={`Errors (${errorCount})`}
            >
              <AlertCircle className="w-4 h-4 text-red-500" />
            </Button>
            {/* Error Badge */}
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {errorCount > 9 ? "9+" : errorCount}
            </div>
          </div>
        )}
        <Button
          onClick={toggleLogPanel}
          variant="ghost"
          className={`hover:bg-gray-100 rounded-lg ${logPanelOpen ? "bg-gray-100" : ""}`}
          size="sm"
          title="Logs (⌘`)"
        >
          <Terminal className="w-4 h-4" />
        </Button>
        <Button
          onClick={runLayout}
          variant="ghost"
          className="hover:bg-gray-100 rounded-lg"
          size="sm"
          title="Organize Layout (⌘⇧L)"
        >
          <Route className="w-4 h-4" />
        </Button>
      </Panel>
    </>
  )
}
