import { useReactFlow } from "@xyflow/react"
import { useCallback, useMemo } from "react"

import type { AppStore } from "@/features/react-flow-visualization/store/app-store"
import { useAppStore } from "@/features/react-flow-visualization/store/store"
import { useShallow } from "zustand/react/shallow"

const selector = (state: AppStore) => ({
  addNodeByType: state.addNodeByType,
  addNodeInBetween: state.addNodeInBetween,
  potentialConnection: state.potentialConnection,
  setDraggedPaletteNodeType: state.setDraggedPaletteNodeType,
})

export function useDragAndDrop() {
  const { screenToFlowPosition } = useReactFlow()
  const { addNodeByType, addNodeInBetween, potentialConnection, setDraggedPaletteNodeType } = useAppStore(
    useShallow(selector),
  )

  const onDrop: React.DragEventHandler = useCallback(
    event => {
      const nodeProps = JSON.parse(event.dataTransfer.getData("application/reactflow"))

      if (!nodeProps) return

      // Only add to canvas if it's NOT a human or connector node (those attach to agents)
      if (nodeProps.id !== "human-node" && nodeProps.id !== "connector-node") {
        if (potentialConnection) {
          addNodeInBetween({
            type: nodeProps.id,
            source: potentialConnection.source?.node,
            target: potentialConnection.target?.node,
            sourceHandleId: potentialConnection.source?.handle,
            targetHandleId: potentialConnection.target?.handle,
            position: potentialConnection.position,
          })
        } else {
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })

          addNodeByType(nodeProps.id, position)
        }
      }

      // Clear dragged state
      setDraggedPaletteNodeType(undefined)
    },
    [addNodeByType, addNodeInBetween, screenToFlowPosition, potentialConnection, setDraggedPaletteNodeType],
  )

  const onDragOver: React.DragEventHandler = useCallback(event => event.preventDefault(), [])

  return useMemo(() => ({ onDrop, onDragOver }), [onDrop, onDragOver])
}
