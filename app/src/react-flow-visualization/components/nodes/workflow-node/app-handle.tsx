"use client"

import { Position, useConnection, useInternalNode, useNodeConnections, useNodeId, XYPosition } from "@xyflow/react"
import clsx from "clsx"
import { useCallback, useEffect } from "react"
import { useShallow } from "zustand/react/shallow"

import { type AppStore } from "@/react-flow-visualization/store/app-store"

import { AppDropdownMenu } from "@/react-flow-visualization/components/app-dropdown-menu"
import { ButtonHandle } from "@/react-flow-visualization/components/button-handle"
import { type AppNodeType, NodeConfig } from "@/react-flow-visualization/components/nodes"
import { Button } from "@/react-flow-visualization/components/ui/button"

import { useDropdown } from "@/react-flow-visualization/hooks/use-dropdown"
import { useAppStore } from "@/react-flow-visualization/store"

const compatibleNodeTypes = (type: "source" | "target") => {
  if (type === "source") {
    return (node: NodeConfig) => {
      return (
        node.id === "transform-node" ||
        node.id === "join-node" ||
        node.id === "branch-node" ||
        node.id === "output-node"
      )
    }
  }
  return (node: NodeConfig) => {
    return (
      node.id === "transform-node" || node.id === "join-node" || node.id === "branch-node" || node.id === "initial-node"
    )
  }
}

const selector = (nodeId: string, type: string, id?: string | null) => (state: AppStore) => ({
  addNodeInBetween: state.addNodeInBetween,
  draggedNodes: state.draggedNodes,
  connectionSites: state.connectionSites,
  isPotentialConnection: state.potentialConnection?.id === `handle-${nodeId}-${type}-${id}`,
})

// TODO: we need to streamline how we calculate the yOffset
const yOffset = (type: "source" | "target") => (type === "source" ? 50 : -65)

function getIndicatorPostion(nodePosition: XYPosition, x: number, y: number, type: "source" | "target") {
  return {
    x: nodePosition.x + x,
    y: nodePosition.y + y + yOffset(type),
  }
}

const fallbackPosition = { x: 0, y: 0 }

export function AppHandle({
  className,
  position: handlePosition,
  type,
  id,
  x,
  y,
}: {
  className?: string
  id?: string | null
  type: "source" | "target"
  position: Position
  x: number
  y: number
}) {
  const nodeId = useNodeId() ?? ""

  const connections = useNodeConnections({
    handleType: type,
    handleId: id ?? undefined,
  })

  const isConnectionInProgress = useConnection((c) => c.inProgress)

  const { isOpen, toggleDropdown } = useDropdown()
  const { draggedNodes, addNodeInBetween, connectionSites, isPotentialConnection } = useAppStore(
    useShallow(selector(nodeId, type, id))
  )

  // We get the actual position of the node
  const nodePosition = useInternalNode(nodeId)?.internals.positionAbsolute ?? fallbackPosition

  const onClick = () => {
    toggleDropdown()
  }

  const onAddNode = useCallback(
    (nodeType: AppNodeType) => {
      if (!nodeId) {
        return
      }

      addNodeInBetween({
        type: nodeType,
        [type]: nodeId,
        [`${type}HandleId`]: id,
        position: getIndicatorPostion(nodePosition, x, y, type),
      })

      toggleDropdown()
    },
    [nodeId, id, type, nodePosition, x, y, toggleDropdown, addNodeInBetween]
  )

  const displayAddButton = connections.length === 0 && !isConnectionInProgress && !draggedNodes.has(nodeId)

  const connectionId = `handle-${nodeId}-${type}-${id}`
  useEffect(() => {
    if (displayAddButton) {
      connectionSites.set(connectionId, {
        position: getIndicatorPostion(nodePosition, x, y, type),
        [type]: {
          node: nodeId,
          handle: id,
        },
        type,
        id: connectionId,
      })
    }
    return () => {
      connectionSites.delete(connectionId)
    }
  }, [nodePosition, connectionSites, connectionId, id, nodeId, type, x, y, displayAddButton])
  return (
    <ButtonHandle
      type={type}
      position={handlePosition}
      id={id}
      className={clsx("left-[-6px] top-[-6px]", className)}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      showButton={displayAddButton}
    >
      <Button
        onClick={onClick}
        size="icon"
        variant="secondary"
        className={clsx("border h-6 w-6 rounded-xl hover:bg-card", {
          "border-red-500": isPotentialConnection,
        })}
      >
        +
      </Button>
      {isOpen && (
        <div className="absolute z-50 mt-2 left-1/2 transform -translate-x-1/2">
          <AppDropdownMenu onAddNode={onAddNode} filterNodes={compatibleNodeTypes(type)} />
        </div>
      )}
    </ButtonHandle>
  )
}
