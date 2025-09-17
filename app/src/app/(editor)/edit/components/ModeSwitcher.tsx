"use client"

type EditMode = "graph" | "json" | "eval"

type ModeSwitcherProps = {
  mode: EditMode
  onChange: (mode: EditMode) => void
}

export default function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  const baseClass =
    "px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
  const inactiveClass = "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
  const activeClass = "bg-white text-gray-900 shadow-sm"

  return (
    <div
      className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg"
      data-testid="mode-switcher"
    >
      <button
        onClick={() => onChange("graph")}
        className={`${baseClass} ${mode === "graph" ? activeClass : inactiveClass}`}
        data-testid="mode-switcher-graph"
      >
        Graph Mode
      </button>
      <button
        onClick={() => onChange("json")}
        className={`${baseClass} ${mode === "json" ? activeClass : inactiveClass}`}
        data-testid="mode-switcher-json"
      >
        JSON Mode
      </button>
      <button
        onClick={() => onChange("eval")}
        className={`${baseClass} ${mode === "eval" ? activeClass : inactiveClass}`}
        data-testid="mode-switcher-eval"
      >
        Run & Evaluate
      </button>
    </div>
  )
}
