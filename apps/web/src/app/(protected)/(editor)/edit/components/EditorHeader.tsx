"use client"

import ModeSwitcher from "./ModeSwitcher"

type EditMode = "graph" | "json" | "eval"

type EditorHeaderProps = {
  title: string
  mode: EditMode
  onModeChange: (mode: EditMode) => void
  actions?: React.ReactNode
}

export default function EditorHeader({ title, mode, onModeChange, actions }: EditorHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center space-x-2">
        {actions}
        <ModeSwitcher mode={mode} onChange={onModeChange} />
      </div>
    </div>
  )
}
