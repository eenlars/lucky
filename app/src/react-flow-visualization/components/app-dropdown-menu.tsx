import nodesConfig, {
  AppNodeType,
  NodeConfig,
} from "@/react-flow-visualization/components/nodes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/react-flow-visualization/components/ui/dropdown-menu"
import { iconMapping } from "@/react-flow-visualization/components/ui/icon-mapping"

export function AppDropdownMenu({
  onAddNode,
  filterNodes = () => true,
}: {
  onAddNode: (type: AppNodeType) => void
  filterNodes?: (node: NodeConfig) => boolean
}) {
  return (
    <DropdownMenu open>
      <DropdownMenuTrigger />
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Nodes</DropdownMenuLabel>
        {Object.values(nodesConfig)
          .filter(filterNodes)
          .map((item) => {
            const IconComponent = item?.icon
              ? iconMapping[item.icon]
              : undefined
            return (
              <button
                key={item.title}
                onClick={() => onAddNode(item.id)}
                className="w-full"
              >
                <DropdownMenuItem className="flex items-center space-x-2">
                  {IconComponent ? (
                    <IconComponent aria-label={item?.icon} />
                  ) : null}
                  <span>New {item.title}</span>
                </DropdownMenuItem>
              </button>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
