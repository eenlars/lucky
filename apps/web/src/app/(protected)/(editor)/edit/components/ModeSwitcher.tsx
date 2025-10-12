"use client"

import { useFeatureFlag } from "@/lib/feature-flags"
import { Code2, Lock, Play, Workflow } from "lucide-react"

type EditMode = "graph" | "json" | "eval"

type ModeSwitcherProps = {
  mode: EditMode
  onChange: (mode: EditMode) => void
}

const modes = [
  {
    id: "graph" as const,
    icon: Workflow,
    label: "Graph",
    tooltip: "Visual workflow editor",
  },
  {
    id: "json" as const,
    icon: Code2,
    label: "Code",
    tooltip: "JSON configuration",
  },
  {
    id: "eval" as const,
    icon: Play,
    label: "Run",
    tooltip: "Test & evaluate",
    requiresFlag: "EVAL_MODE" as const,
  },
]

export default function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  const evalModeEnabled = useFeatureFlag("EVAL_MODE")
  return (
    <div
      className="inline-flex gap-0.5 p-0.5 bg-gray-100/80 rounded-lg border border-gray-200/50"
      data-testid="mode-switcher"
    >
      {modes.map(({ id, icon: Icon, label, tooltip, requiresFlag }) => {
        const isActive = mode === id
        const isDisabled = requiresFlag && !evalModeEnabled

        return (
          <button
            key={id}
            type="button"
            onClick={() => !isDisabled && onChange(id)}
            disabled={isDisabled}
            className={`
              group relative flex items-center gap-1.5 px-3 py-1.5 rounded-md
              text-xs font-medium transition-all duration-200
              ${isDisabled ? "opacity-50 cursor-not-allowed text-gray-400" : isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-white/50"}
            `}
            data-testid={`mode-switcher-${id}`}
            aria-label={tooltip}
          >
            {isDisabled ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Icon className={`w-3.5 h-3.5 transition-transform ${isActive ? "" : "group-hover:scale-110"}`} />
            )}
            <span>{label}</span>

            {/* Tooltip */}
            <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {isDisabled ? "Coming Soon" : tooltip}
            </span>
          </button>
        )
      })}
    </div>
  )
}
