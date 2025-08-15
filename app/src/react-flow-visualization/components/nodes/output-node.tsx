import nodesConfig, { COMPACT_NODE_SIZE, WorkflowNodeProps } from "."
import { AppHandle } from "./workflow-node/app-handle"

export function OutputNode({ id, data: _data }: WorkflowNodeProps) {
  return (
    <div
      id={id}
      style={{
        width: COMPACT_NODE_SIZE.width,
        height: COMPACT_NODE_SIZE.height,
      }}
      className="relative select-none"
      aria-label="End"
      role="img"
    >
      {/* Minimal, non-interactive visual */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-9 h-9 rounded-full bg-slate-700/90 shadow-sm ring-4 ring-slate-300/40" />
        <div className="mt-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
          End
        </div>
      </div>

      {/* Connection handle(s) remain functional */}
      {nodesConfig["output-node"].handles.map((handle) => (
        <AppHandle
          key={`${handle.type}-${handle.id}`}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          x={handle.x}
          y={handle.y}
        />
      ))}
    </div>
  )
}
