import nodesConfig, { COMPACT_NODE_SIZE, WorkflowNodeProps } from "."
import { AppHandle } from "./workflow-node/app-handle"

export function InitialNode({ id, data: _data }: WorkflowNodeProps) {
  return (
    <div
      id={id}
      // Use compact footprint so pointer matches visual circle
      style={{
        width: COMPACT_NODE_SIZE.width,
        height: COMPACT_NODE_SIZE.height,
      }}
      className="relative select-none"
      aria-label="Start"
      role="img"
    >
      {/* Minimal, non-interactive visual */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-9 h-9 rounded-full bg-emerald-500/80 shadow-sm ring-4 ring-emerald-200/40" />
        <div className="mt-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
          Start
        </div>
      </div>

      {/* Connection handle(s) remain functional */}
      {nodesConfig["initial-node"].handles.map((handle) => (
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
