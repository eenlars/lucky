"use client"

import { Switch } from "@/components/ui/switch"
import type { ModelCardProps } from "./types"

export function ModelCard({ model, isEnabled, onToggle, isRecommended }: ModelCardProps) {
  return (
    <div className="flex items-center gap-8 py-4 px-6 border-b border-border/40 last:border-b-0 hover:bg-accent/5 transition-colors">
      {/* Model name */}
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[13px] leading-tight text-foreground truncate">{model.name}</div>
        {isRecommended && <div className="text-[10px] text-muted-foreground mt-0.5">Recommended</div>}
      </div>

      {/* Capabilities - text only */}
      <div className="text-[11px] text-muted-foreground/80 uppercase tracking-wider shrink-0 w-32">
        {[
          model.supportsTools && "Tools",
          model.supportsVision && "Vision",
          model.supportsReasoning && "Reasoning",
          model.supportsAudio && "Audio",
          model.supportsVideo && "Video",
        ]
          .filter(Boolean)
          .join(" · ")}
      </div>

      {/* Intelligence */}
      <div className="text-[13px] text-foreground/60 tabular-nums shrink-0 w-8 text-right">{model.intelligence}</div>

      {/* Context */}
      <div className="text-[13px] text-foreground/60 tabular-nums shrink-0 w-12 text-right">
        {(model.contextLength / 1000).toFixed(0)}k
      </div>

      {/* Cost */}
      <div className="text-[11px] text-foreground/60 tabular-nums shrink-0 w-32 text-right">
        ${model.inputCostPer1M.toFixed(2)} / ${model.outputCostPer1M.toFixed(2)}
      </div>

      {/* Toggle */}
      <Switch checked={isEnabled} onCheckedChange={onToggle} className="shrink-0" />
    </div>
  )
}
