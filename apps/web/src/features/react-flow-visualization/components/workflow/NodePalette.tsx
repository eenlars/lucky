"use client"

import { useAppStore } from "@/features/react-flow-visualization/store/store"
import { cn } from "@/lib/utils"
import { Panel } from "@xyflow/react"
import { Brain, CheckCheck, Plug, Rocket, User } from "lucide-react"

/**
 * Node Palette - Three infinite stacks
 *
 * Rams principles:
 * - Understandable: See all 3 types at once
 * - Honest: Each stack shows what it contains
 * - Aesthetic: Stack depth = infinite availability
 * - Useful: Drag from any stack, more appears behind
 */

interface NodeType {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: {
    bg: string
    icon: string
    border: string
  }
}

const baseNodes: NodeType[] = [
  {
    id: "initial-node",
    label: "Start",
    icon: Rocket,
    color: {
      bg: "bg-green-50 dark:bg-green-950",
      icon: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-800 hover:border-green-500 dark:hover:border-green-400",
    },
  },
  {
    id: "transform-node",
    label: "Agent",
    icon: Brain,
    color: {
      bg: "bg-blue-50 dark:bg-blue-950",
      icon: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800 hover:border-blue-500 dark:hover:border-blue-400",
    },
  },
  {
    id: "output-node",
    label: "End",
    icon: CheckCheck,
    color: {
      bg: "bg-purple-50 dark:bg-purple-950",
      icon: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800 hover:border-purple-500 dark:hover:border-purple-400",
    },
  },
]

// Development-only nodes
const humanNode: NodeType = {
  id: "human-node",
  label: "Human",
  icon: User,
  color: {
    bg: "bg-amber-50 dark:bg-amber-950",
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800 hover:border-amber-500 dark:hover:border-amber-400",
  },
}

const connectorNode: NodeType = {
  id: "connector-node",
  label: "Connector",
  icon: Plug,
  color: {
    bg: "bg-emerald-50 dark:bg-emerald-950",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 dark:hover:border-emerald-400",
  },
}

const availableNodes: NodeType[] =
  process.env.NODE_ENV === "development"
    ? [...baseNodes.slice(0, 2), connectorNode, humanNode, baseNodes[2]]
    : baseNodes

interface StackCardProps {
  node: NodeType
  depth: number // 0 = front, 1 = middle, 2 = back
}

function StackCard({ node, depth }: StackCardProps) {
  const Icon = node.icon
  const setDraggedPaletteNodeType = useAppStore(state => state.setDraggedPaletteNodeType)

  // Stack depth effect
  const offset = depth * 3 // 3px offset per layer
  const scale = 1 - depth * 0.03 // 3% smaller per layer
  const opacity = 1 - depth * 0.2 // 20% fade per layer

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/reactflow", JSON.stringify({ id: node.id }))
    e.dataTransfer.effectAllowed = "move"
    setDraggedPaletteNodeType(node.id as any)
  }

  const handleDragEnd = () => {
    setDraggedPaletteNodeType(undefined)
  }

  return (
    <div
      draggable={depth === 0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "absolute bg-white dark:bg-gray-900 border-2 rounded-xl transition-all duration-200",
        depth === 0
          ? cn("cursor-grab active:cursor-grabbing shadow-lg hover:shadow-xl z-20", node.color.border)
          : "border-gray-200 dark:border-gray-800 pointer-events-none z-10",
      )}
      style={{
        width: "100px",
        height: "100px",
        top: `${offset}px`,
        left: `${offset}px`,
        transform: `scale(${scale})`,
        opacity: opacity,
      }}
    >
      <div className="flex flex-col items-center justify-center h-full p-3 text-center gap-1.5">
        <div className={cn("p-2 rounded-lg", node.color.bg, node.color.icon)}>
          <Icon className="size-5" />
        </div>
        <p
          className={cn(
            "text-xs font-semibold",
            depth === 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400",
          )}
        >
          {node.label}
        </p>
      </div>
    </div>
  )
}

function NodeStack({ node }: { node: NodeType }) {
  // Show 3 cards deep for stack illusion
  return (
    <div className="relative" style={{ width: "106px", height: "106px" }}>
      {[0, 1, 2].map(depth => (
        <StackCard key={depth} node={node} depth={depth} />
      ))}
    </div>
  )
}

export function NodePalette() {
  return (
    <Panel position="top-left" className="!pointer-events-none" style={{ margin: "80px 0 0 24px" }}>
      <div className="pointer-events-auto space-y-3">
        {availableNodes.map(node => (
          <NodeStack key={node.id} node={node} />
        ))}
        <p className="text-xs text-center text-gray-400 dark:text-gray-600 mt-2">Drag onto canvas</p>
      </div>
    </Panel>
  )
}
