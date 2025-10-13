"use client"

import type { EnrichedModelInfo } from "@lucky/shared"

interface ModelCardExpandedProps {
  model: EnrichedModelInfo
}

export function ModelCardExpanded({ model }: ModelCardExpandedProps) {
  return (
    <div className="mt-3 pt-3 border-t space-y-3 text-xs">
      {/* Detailed pricing */}
      <div className="space-y-1.5">
        <h4 className="font-medium text-foreground">Pricing Details</h4>
        <div className="space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span>Input:</span>
            <span className="font-medium text-foreground">${model.inputCostPer1M.toFixed(4)} / 1M tokens</span>
          </div>
          <div className="flex justify-between">
            <span>Output:</span>
            <span className="font-medium text-foreground">${model.outputCostPer1M.toFixed(4)} / 1M tokens</span>
          </div>
        </div>
      </div>

      {/* Exact context length */}
      <div className="space-y-1.5">
        <h4 className="font-medium text-foreground">Context Window</h4>
        <p className="text-muted-foreground">{model.contextLength.toLocaleString()} tokens</p>
      </div>

      {/* Capabilities description */}
      <div className="space-y-1.5">
        <h4 className="font-medium text-foreground">Capabilities</h4>
        <ul className="space-y-1 text-muted-foreground list-disc list-inside">
          {model.supportsTools && <li>Function calling / Tool use</li>}
          {model.supportsVision && <li>Image understanding and analysis</li>}
          {model.supportsReasoning && <li>Extended reasoning capabilities</li>}
          {model.supportsAudio && <li>Audio processing</li>}
          {model.supportsVideo && <li>Video understanding</li>}
          {!model.supportsTools &&
            !model.supportsVision &&
            !model.supportsReasoning &&
            !model.supportsAudio &&
            !model.supportsVideo && <li>Text-only model</li>}
        </ul>
      </div>
    </div>
  )
}
