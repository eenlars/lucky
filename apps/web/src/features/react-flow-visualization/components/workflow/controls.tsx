import { Panel } from "@xyflow/react"
import { Route, Terminal } from "lucide-react"
import { useEffect } from "react"
import { useShallow } from "zustand/react/shallow"

import { Button } from "@/features/react-flow-visualization/components/ui/button"
import { ZoomSlider } from "@/features/react-flow-visualization/components/zoom-slider"
import { useLayout } from "@/features/react-flow-visualization/hooks/use-layout"
import { useAppStore } from "@/features/react-flow-visualization/store/store"

export function WorkflowControls() {
  const runLayout = useLayout(true)
  const { logPanelOpen, toggleLogPanel } = useAppStore(
    useShallow(state => ({
      logPanelOpen: state.logPanelOpen,
      toggleLogPanel: state.toggleLogPanel,
    })),
  )

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
      <ZoomSlider position="bottom-left" className="bg-white border border-gray-200 shadow-md" />
      <Panel
        position="bottom-right"
        className="bg-white border border-gray-200 text-foreground rounded-lg shadow-md p-1 flex gap-1"
      >
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
