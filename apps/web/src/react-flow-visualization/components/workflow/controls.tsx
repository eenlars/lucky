import { Panel } from "@xyflow/react"
import { Route } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/react-flow-visualization/components/ui/button"
import { ZoomSlider } from "@/react-flow-visualization/components/zoom-slider"
import { useLayout } from "@/react-flow-visualization/hooks/use-layout"

export function WorkflowControls() {
  const runLayout = useLayout(true)

  // Keyboard shortcut: Cmd/Ctrl + Shift + L to organize layout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "l") {
        e.preventDefault()
        runLayout()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [runLayout])

  return (
    <>
      <ZoomSlider position="bottom-left" className="bg-white border border-gray-200 shadow-md" />
      <Panel
        position="bottom-right"
        className="bg-white border border-gray-200 text-foreground rounded-lg shadow-md p-1"
      >
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
