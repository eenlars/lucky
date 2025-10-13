"use client"

import { NodeHeaderDeleteAction } from "@/features/react-flow-visualization/components/node-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/features/react-flow-visualization/components/ui/dialog"
import { User } from "lucide-react"
import { useState } from "react"
import nodesConfig, { COMPACT_NODE_SIZE, type WorkflowNodeProps } from "./nodes"
import { AppHandle } from "./workflow-node/app-handle"

export function HumanNode({ id, data: _data }: WorkflowNodeProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleClick = () => {
    setDialogOpen(true)
  }

  return (
    <>
      <div
        id={id}
        style={{
          width: COMPACT_NODE_SIZE.width,
          height: COMPACT_NODE_SIZE.height,
        }}
        className="relative select-none group"
        aria-label="Human"
        role="img"
      >
        {/* Human node content */}
        <div className="absolute inset-0 cursor-pointer" onClick={handleClick}>
          <div
            className={`
            w-full h-full rounded-xl shadow-lg border-2
            flex items-center justify-center
            transition-all duration-300
            bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800
            hover:border-amber-500 dark:hover:border-amber-400
          `}
          >
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <User className="size-5" />
            </div>
          </div>
        </div>

        {/* Delete button on hover */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          <NodeHeaderDeleteAction />
        </div>

        {/* Connection handles */}
        {nodesConfig["human-node"].handles.map(handle => (
          <AppHandle
            key={`${handle.type}-${handle.id}`}
            id={handle.id}
            type={handle.type}
            position={handle.position}
            x={handle.x}
            y={handle.y}
          />
        ))}
      </div>

      {/* Dialog for human interaction */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Human Input Required</DialogTitle>
            <DialogDescription>Configure how this node will request human intervention.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This node pauses workflow execution and waits for human input.
            </p>
            {/* Placeholder for future configuration */}
            <div className="p-4 border border-dashed border-amber-300 dark:border-amber-700 rounded-lg text-center text-sm text-gray-500">
              Configuration options coming soon
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
