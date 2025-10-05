import nodesConfig, { COMPACT_NODE_SIZE, type WorkflowNodeProps } from "./nodes"
import { AppHandle } from "./workflow-node/app-handle"

export function InitialNode({ id, data: _data }: WorkflowNodeProps) {
  return (
    <div
      id={id}
      style={{
        width: COMPACT_NODE_SIZE.width,
        height: COMPACT_NODE_SIZE.height,
      }}
      className="relative select-none"
      aria-label="Start"
      role="img"
    >
      {/* Jony Ive inspired minimal square */}
      <div className="pointer-events-none absolute inset-0">
        <div className="w-full h-full rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-sm border border-emerald-300/50 flex items-center justify-center">
          <div className="text-[9px] font-semibold tracking-wider text-white/90 uppercase">Start</div>
        </div>
      </div>

      {/* Connection handle(s) remain functional */}
      {nodesConfig["initial-node"].handles.map(handle => (
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
