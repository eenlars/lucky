"use client"

import type { ReactNode } from "react"

import nodesConfig, { type AppNodeType } from "@/features/react-flow-visualization/components/nodes/nodes"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/features/react-flow-visualization/components/ui/context-menu"
import { iconMapping } from "@/features/react-flow-visualization/components/ui/icon-mapping"
import { useClientPosition } from "@/features/react-flow-visualization/hooks/use-client-position"
import { useAppStore } from "@/features/react-flow-visualization/store/store"

export default function AppContextMenu({ children }: { children: ReactNode }) {
  const [position, setPosition] = useClientPosition()
  const addNodeByType = useAppStore(s => s.addNodeByType)

  const onItemClick = (nodeType: AppNodeType) => {
    if (!position) {
      return
    }

    addNodeByType(nodeType, position)
  }

  return (
    <div className="h-full w-full bg-gray-100" onContextMenu={setPosition}>
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {Object.values(nodesConfig).map(item => {
            const IconComponent = item?.icon ? iconMapping[item.icon] : undefined
            return (
              <button
                type="button"
                key={item.displayName}
                onClick={() => onItemClick(item.id)}
                className="w-full cursor-pointer"
              >
                <ContextMenuItem className="flex items-center space-x-2 cursor-pointer">
                  {IconComponent ? <IconComponent aria-label={item?.icon} /> : null}
                  <span>New {item.displayName}</span>
                </ContextMenuItem>
              </button>
            )
          })}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}
