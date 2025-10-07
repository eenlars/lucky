import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react"
import { type CSSProperties, useCallback, useEffect } from "react"

import { AppDropdownMenu } from "@/react-flow-visualization/components/app-dropdown-menu"
import type { AppNodeType, NodeConfig } from "@/react-flow-visualization/components/nodes/nodes"
import { Button } from "@/react-flow-visualization/components/ui/button"
import { useDropdown } from "@/react-flow-visualization/hooks/use-dropdown"
import type { AppStore } from "@/react-flow-visualization/store/app-store"
import { useAppStore } from "@/react-flow-visualization/store/store"
import clsx from "clsx"
import { useShallow } from "zustand/react/shallow"
import type { AppEdge } from "../edges"

const selector = (id: string) => {
  return (state: AppStore) => ({
    addNodeInBetween: state.addNodeInBetween,
    connectionSites: state.connectionSites,
    isPotentialConnection: state.potentialConnection?.id === `edge-${id}`,
  })
}

const filterNodes = (node: NodeConfig) => {
  return node.id === "transform-node" || node.id === "join-node" || node.id === "branch-node"
}

export function EdgeButton({
  x,
  y,
  id,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  style,
}: Pick<EdgeProps<AppEdge>, "source" | "target" | "sourceHandleId" | "targetHandleId" | "id"> & {
  x: number
  y: number
  style: CSSProperties
}) {
  const { addNodeInBetween, connectionSites, isPotentialConnection } = useAppStore(useShallow(selector(id)))
  const { isOpen, toggleDropdown, ref } = useDropdown()

  const onAddNode = useCallback(
    (type: AppNodeType) => {
      addNodeInBetween({
        type,
        source,
        target,
        sourceHandleId: sourceHandleId ?? undefined,
        targetHandleId: targetHandleId ?? undefined,
        position: { x, y },
      })
    },
    [addNodeInBetween, source, sourceHandleId, targetHandleId, target, x, y],
  )

  const connectionId = `edge-${id}`
  // We add the possible connection sites to the store
  useEffect(() => {
    connectionSites.set(connectionId, {
      position: { x, y },
      source: { node: source, handle: sourceHandleId },
      target: { node: target, handle: targetHandleId },
      id: connectionId,
    })
  }, [connectionSites, x, y, connectionId, source, sourceHandleId, target, targetHandleId])

  // we only want to remove the connection site when the component is unmounted
  useEffect(() => {
    return () => {
      connectionSites.delete(connectionId)
    }
  }, [connectionSites, connectionId])

  return (
    <EdgeLabelRenderer>
      <div
        className="nodrag nopan pointer-events-auto absolute"
        style={{
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          ...style,
        }}
      >
        <Button
          onClick={e => {
            e.stopPropagation()
            toggleDropdown()
          }}
          size="icon"
          variant="secondary"
          className={clsx("h-7 w-7 rounded-md border bg-white shadow hover:shadow-md transition-all duration-200", {
            "border-blue-500 bg-blue-50": isPotentialConnection,
            "border-gray-300": !isPotentialConnection,
          })}
        >
          <span className="text-sm font-semibold">+</span>
        </Button>
      </div>
      {isOpen && (
        <div
          ref={ref}
          className="absolute z-50"
          style={{
            top: `${y}px`,
            left: `${x}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <AppDropdownMenu onAddNode={onAddNode} filterNodes={filterNodes} />
        </div>
      )}
    </EdgeLabelRenderer>
  )
}
