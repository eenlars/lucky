"use client"

import { useMemo, useState, type MouseEvent } from "react"

import { Button } from "@/ui/button"
import { toWorkflowConfig, type WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { MODELS } from "@lucky/examples/settings/constants.client"

interface StructureMiniMapProps {
  dsl: WorkflowConfig
  width?: number
  height?: number
}

// Utility function to get node count from DSL
export function getNodeCountFromDsl(dsl: WorkflowConfig): number {
  try {
    if (!dsl) return 0
    const parsedDsl = typeof dsl === "string" ? JSON.parse(dsl) : dsl
    const validConfig = toWorkflowConfig(parsedDsl)
    return validConfig?.nodes?.length || 0
  } catch (err) {
    console.error("Error parsing DSL data:", err)
    return 0
  }
}

export function StructureMiniMap({ dsl, width, height }: StructureMiniMapProps) {
  const [showDslInspector, setShowDslInspector] = useState(false)
  const { nodePositions, scale, lines, parsedNodes } = useMemo(() => {
    // Parse DSL if it's a string, otherwise use it directly
    let finalNodes: WorkflowConfig["nodes"] = []
    try {
      if (!dsl) {
        finalNodes = []
      } else {
        const parsedDsl = typeof dsl === "string" ? JSON.parse(dsl) : dsl
        const validConfig = toWorkflowConfig(parsedDsl)
        finalNodes = validConfig?.nodes || []
      }
    } catch (err) {
      console.error("Error parsing DSL data:", err)
      finalNodes = []
    }

    // calculate node positions with proper branching layout
    const positions = new Map<string, { x: number; y: number }>()
    const nodeHeight = 24
    const verticalSpacing = 40
    const horizontalSpacing = 140
    const containerWidth = width ?? 250
    const containerHeight = height ?? 200
    const nodeWidth = 120

    // add implicit end node for nodes that don't hand off to anything
    const hasEndNode = finalNodes.some(node => node.nodeId === "end")
    const needsEndNode = !hasEndNode

    if (needsEndNode) {
      finalNodes.push({
        nodeId: "end",
        handOffs: [],
        systemPrompt: "",
        mcpTools: [],
        codeTools: [],
        description: "End node",
        modelName: MODELS.default,
        memory: {},
      })
    }

    // build parent-child relationships
    const parents = new Map<string, string[]>()
    const children = new Map<string, string[]>()

    finalNodes.forEach(node => {
      // for nodes without handoffs, connect them to the end node
      const handoffs = node.handOffs.length === 0 && node.nodeId !== "end" ? ["end"] : node.handOffs

      handoffs.forEach(childId => {
        if (!parents.has(childId)) parents.set(childId, [])
        parents.get(childId)!.push(node.nodeId)

        if (!children.has(node.nodeId)) children.set(node.nodeId, [])
        children.get(node.nodeId)!.push(childId)
      })
    })

    // find root nodes (nodes with no parents)
    const rootNodes = finalNodes.filter(node => !parents.has(node.nodeId))

    // assign levels using BFS
    const levels = new Map<string, number>()
    const queue = rootNodes.map(node => ({ nodeId: node.nodeId, level: 0 }))

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!
      levels.set(nodeId, level)

      const nodeChildren = children.get(nodeId) || []
      nodeChildren.forEach(childId => {
        if (!levels.has(childId)) {
          queue.push({ nodeId: childId, level: level + 1 })
        }
      })
    }

    // ensure end node is at the bottom level
    if (needsEndNode) {
      const currentMaxLevel = Math.max(...Array.from(levels.values()))
      levels.set("end", currentMaxLevel + 1)
    }

    // group nodes by level
    const levelGroups = new Map<number, string[]>()
    levels.forEach((level, nodeId) => {
      if (!levelGroups.has(level)) levelGroups.set(level, [])
      levelGroups.get(level)!.push(nodeId)
    })

    // position nodes
    levelGroups.forEach((nodeIds, level) => {
      const y = level * verticalSpacing + 20

      if (nodeIds.length === 1) {
        // single node at this level, center it
        positions.set(nodeIds[0], {
          x: (containerWidth - nodeWidth) / 2,
          y: y,
        })
      } else {
        // multiple nodes at this level, distribute horizontally
        const totalWidth = (nodeIds.length - 1) * horizontalSpacing + nodeWidth
        const startX = (containerWidth - totalWidth) / 2

        nodeIds.forEach((nodeId, index) => {
          positions.set(nodeId, {
            x: startX + index * horizontalSpacing,
            y: y,
          })
        })
      }
    })

    // calculate scale if content exceeds container
    const maxLevel = Math.max(...Array.from(levels.values()))
    const totalHeight = (maxLevel + 1) * verticalSpacing + 40
    const maxNodesAtLevel = Math.max(...Array.from(levelGroups.values()).map(nodes => nodes.length))
    const totalWidth = Math.max(nodeWidth, (maxNodesAtLevel - 1) * horizontalSpacing + nodeWidth)

    const verticalScale = totalHeight > containerHeight ? containerHeight / totalHeight : 1
    const horizontalScale = maxNodesAtLevel > 3 ? containerWidth / totalWidth : 1
    const scaleFactor = Math.min(verticalScale, horizontalScale)

    // calculate actual bounds of positioned nodes
    const positionValues = Array.from(positions.values())
    const minX = Math.min(...positionValues.map(p => p.x))
    const maxX = Math.max(...positionValues.map(p => p.x + nodeWidth))
    const minY = Math.min(...positionValues.map(p => p.y))
    const maxY = Math.max(...positionValues.map(p => p.y + nodeHeight))

    const actualWidth = maxX - minX
    const actualHeight = maxY - minY

    // calculate centering offsets based on actual content bounds
    const scaledWidth = actualWidth * scaleFactor
    const scaledHeight = actualHeight * scaleFactor
    const offsetX = (containerWidth - scaledWidth) / 2 - minX * scaleFactor
    const offsetY = (containerHeight - scaledHeight) / 2 - minY * scaleFactor

    // adjust all positions to be centered
    positions.forEach((pos, nodeId) => {
      positions.set(nodeId, {
        x: pos.x + offsetX / scaleFactor,
        y: pos.y + offsetY / scaleFactor,
      })
    })

    // calculate lines between nodes
    const lineElements: Array<{
      x1: number
      y1: number
      x2: number
      y2: number
      key: string
      isEntry?: boolean
    }> = []

    // add entry lines for root nodes
    rootNodes.forEach(node => {
      const nodePos = positions.get(node.nodeId)
      if (!nodePos) return

      lineElements.push({
        x1: nodePos.x + nodeWidth / 2,
        y1: nodePos.y - 20,
        x2: nodePos.x + nodeWidth / 2,
        y2: nodePos.y,
        key: `entry-${node.nodeId}`,
        isEntry: true,
      })
    })

    finalNodes.forEach(node => {
      const sourcePos = positions.get(node.nodeId)
      if (!sourcePos) return

      // for nodes without handoffs, connect them to the end node
      const handoffs = node.handOffs.length === 0 && node.nodeId !== "end" ? ["end"] : node.handOffs

      handoffs.forEach(targetId => {
        const targetPos = positions.get(targetId)
        if (!targetPos) return

        lineElements.push({
          x1: sourcePos.x + nodeWidth / 2,
          y1: sourcePos.y + nodeHeight,
          x2: targetPos.x + nodeWidth / 2,
          y2: targetPos.y,
          key: `${node.nodeId}-${targetId}`,
        })
      })
    })

    return {
      nodePositions: positions,
      scale: scaleFactor,
      lines: lineElements,
      parsedNodes: finalNodes,
    }
  }, [dsl, width, height])

  return (
    <div className="w-full relative overflow-hidden bg-white dark:bg-gray-900" style={{ height: height ?? 200 }}>
      {/* DSL Inspector Button */}
      <Button
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation()
          setShowDslInspector(!showDslInspector)
        }}
        variant="outline"
        size="icon"
        className="absolute top-2 right-2 z-10 w-6 h-6 text-xs font-mono"
        title="Inspect DSL"
      >
        &lt;/&gt;
      </Button>

      {/* DSL Inspector Modal */}
      {showDslInspector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">DSL Inspector</h3>
              <Button
                onClick={() => setShowDslInspector(false)}
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </Button>
            </div>
            <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(dsl, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `scale(${scale})`,
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
        }}
      >
        {/* render lines first so they appear behind nodes */}
        {lines.map(line => {
          const dx = line.x2 - line.x1
          const dy = line.y2 - line.y1
          const length = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx) * (180 / Math.PI)

          return (
            <div
              key={line.key}
              className="absolute bg-gray-300 dark:bg-gray-600"
              style={{
                left: `${line.x1}px`,
                top: `${line.y1}px`,
                width: `${length}px`,
                height: "2px",
                transform: `translateZ(0) rotate(${angle}deg)`,
                transformOrigin: "0 0",
              }}
            />
          )
        })}

        {/* render nodes */}
        {parsedNodes.map(node => {
          const pos = nodePositions.get(node.nodeId)
          if (!pos) return null

          return (
            <div
              key={node.nodeId}
              className="absolute border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs truncate"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: "120px",
                height: "24px",
              }}
            >
              {node.nodeId === "end" ? "🏁 end" : node.nodeId}
            </div>
          )
        })}
      </div>
    </div>
  )
}
