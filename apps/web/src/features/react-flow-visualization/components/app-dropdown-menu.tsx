import nodesConfig, {
  type AppNodeType,
  type NodeConfig,
} from "@/features/react-flow-visualization/components/nodes/nodes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/features/react-flow-visualization/components/ui/dropdown-menu"
import { iconMapping } from "@/features/react-flow-visualization/components/ui/icon-mapping"

export function AppDropdownMenu({
  onAddNode,
  onDelete,
  filterNodes = () => true,
}: {
  onAddNode: (type: AppNodeType) => void
  onDelete?: () => void
  filterNodes?: (node: NodeConfig) => boolean
}) {
  const Trash2Icon = iconMapping.Trash2
  const hasDeleteOption = !!onDelete

  return (
    <DropdownMenu open>
      <DropdownMenuTrigger />
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Insert Node</DropdownMenuLabel>
        {Object.values(nodesConfig)
          .filter(filterNodes)
          .map(item => {
            const IconComponent = item?.icon ? iconMapping[item.icon] : undefined
            return (
              <button
                type="button"
                key={item.displayName}
                onClick={() => onAddNode(item.id)}
                className="w-full cursor-pointer"
              >
                <DropdownMenuItem className="flex items-center space-x-2 cursor-pointer">
                  {IconComponent ? <IconComponent aria-label={item?.icon} className="w-4 h-4" /> : null}
                  <span>New {item.displayName}</span>
                </DropdownMenuItem>
              </button>
            )
          })}
        {hasDeleteOption && (
          <>
            <DropdownMenuSeparator />
            <button type="button" onClick={onDelete} className="w-full cursor-pointer">
              <DropdownMenuItem className="flex items-center space-x-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                {Trash2Icon ? <Trash2Icon aria-label="delete" className="w-4 h-4" /> : null}
                <span>Delete Connection</span>
              </DropdownMenuItem>
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
