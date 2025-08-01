import { Panel } from "@xyflow/react"
import { Route } from "lucide-react"

import { Button } from "@/react-flow-visualization/components/ui/button"
import { ZoomSlider } from "@/react-flow-visualization/components/zoom-slider"
import { useLayout } from "@/react-flow-visualization/hooks/use-layout"

export function WorkflowControls() {
  const runLayout = useLayout(true)

  return (
    <>
      <ZoomSlider position="bottom-left" className="bg-card" />
      <Panel
        position="bottom-right"
        className="bg-card text-foreground rounded-md"
      >
        <Button onClick={runLayout} variant="ghost">
          <Route />
        </Button>
      </Panel>
    </>
  )
}
