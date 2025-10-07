"use client"

import { Panel, type PanelProps, useReactFlow, useStore, useViewport } from "@xyflow/react"
import { Maximize, Minus, Plus } from "lucide-react"

import { Button } from "@/react-flow-visualization/components/ui/button"
import { Slider } from "@/react-flow-visualization/components/ui/slider"
import { cn } from "@/react-flow-visualization/lib/utils"

type ZoomSliderProps = Omit<PanelProps, "children">

function ZoomSlider({ className, ...props }: ZoomSliderProps) {
  const { zoom } = useViewport()
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow()

  const { minZoom, maxZoom } = useStore(
    state => ({
      minZoom: state.minZoom,
      maxZoom: state.maxZoom,
    }),
    (a, b) => a.minZoom !== b.minZoom || a.maxZoom !== b.maxZoom,
  )

  return (
    <Panel className={cn("flex bg-white text-foreground rounded-lg gap-1.5 p-1.5", className)} {...props}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-gray-100 rounded-lg"
        onClick={() => zoomOut({ duration: 300 })}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Slider
        className="w-[140px]"
        value={[zoom]}
        min={minZoom}
        max={maxZoom}
        step={0.01}
        onValueChange={values => zoomTo(values[0])}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-gray-100 rounded-lg"
        onClick={() => zoomIn({ duration: 300 })}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        className="min-w-20 tabular-nums h-8 hover:bg-gray-100 rounded-lg text-xs font-semibold"
        variant="ghost"
        onClick={() => zoomTo(1, { duration: 300 })}
      >
        {(100 * zoom).toFixed(0)}%
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-gray-100 rounded-lg"
        onClick={() => fitView({ duration: 300 })}
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </Panel>
  )
}

ZoomSlider.displayName = "ZoomSlider"

export { ZoomSlider }
