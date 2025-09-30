"use client"

import { ReactNode } from "react"

import nodesConfig, { AppNodeType } from "@/react-flow-visualization/components/nodes"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/react-flow-visualization/components/ui/context-menu"
import { iconMapping } from "@/react-flow-visualization/components/ui/icon-mapping"
import { useClientPosition } from "@/react-flow-visualization/hooks/use-client-position"
import { useAppStore } from "@/react-flow-visualization/store"

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
              <button key={item.displayName} onClick={() => onItemClick(item.id)} className="w-full">
                <ContextMenuItem className="flex items-center space-x-2">
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
