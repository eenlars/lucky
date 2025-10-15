"use client"

import type { ReactNode } from "react"

export default function AppContextMenu({ children }: { children: ReactNode }) {
  // const [position, setPosition] = useClientPosition()
  // const addNodeByType = useAppStore(s => s.addNodeByType)

  // const onItemClick = (nodeType: AppNodeType) => {
  //   if (!position) {
  //     return
  //   }

  //   addNodeByType(nodeType, position)
  // }

  return (
    <div className="h-full w-full bg-gray-100">{children}</div>
    // <div
    //   className="h-full w-full bg-gray-100"
    //   onContextMenu={e => {
    //     e.preventDefault()
    //     e.stopPropagation()
    //     setPosition(e)
    //   }}
    // >
    //   <ContextMenu>
    //     <ContextMenuTrigger>{children}</ContextMenuTrigger>
    //     <ContextMenuContent className="w-64">
    //       {Object.values(nodesConfig).map(item => {
    //         const IconComponent = item?.icon ? iconMapping[item.icon] : undefined
    //         return (
    //           <button
    //             type="button"
    //             key={item.displayName}
    //             onClick={() => onItemClick(item.id)}
    //             className="w-full cursor-pointer"
    //           >
    //             <ContextMenuItem className="flex items-center space-x-2 cursor-pointer">
    //               {IconComponent ? <IconComponent aria-label={item?.icon} /> : null}
    //               <span>New {item.displayName}</span>
    //             </ContextMenuItem>
    //           </button>
    //         )
    //       })}
    //     </ContextMenuContent>
    //   </ContextMenu>
    // </div>
  )
}
