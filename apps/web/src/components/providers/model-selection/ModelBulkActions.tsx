"use client"

import type { ModelBulkActionsProps } from "./types"

export function ModelBulkActions({
  totalModels,
  enabledModels,
  filteredModels,
  onEnableRecommended,
  onEnableAll,
  onDisableAll,
}: ModelBulkActionsProps) {
  return (
    <div className="flex items-center justify-between py-3 text-[13px]">
      <div className="text-muted-foreground">
        {enabledModels} of {totalModels} enabled
        {filteredModels < totalModels && <span className="text-muted-foreground/60"> · {filteredModels} shown</span>}
      </div>

      <div className="flex gap-6">
        <button
          type="button"
          onClick={onEnableRecommended}
          className="text-foreground hover:text-foreground/80 transition-colors"
        >
          Enable recommended
        </button>
        <button
          type="button"
          onClick={onEnableAll}
          disabled={enabledModels === totalModels}
          className="text-foreground hover:text-foreground/80 transition-colors disabled:text-muted-foreground/40 disabled:cursor-not-allowed"
        >
          Enable all
        </button>
        <button
          type="button"
          onClick={onDisableAll}
          disabled={enabledModels === 0}
          className="text-foreground hover:text-foreground/80 transition-colors disabled:text-muted-foreground/40 disabled:cursor-not-allowed"
        >
          Disable all
        </button>
      </div>
    </div>
  )
}
