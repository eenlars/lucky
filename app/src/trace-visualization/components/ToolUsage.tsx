"use client"

import { Button } from "@/react-flow-visualization/components/ui/button"
import { Card } from "@/ui/card"
import { Separator } from "@/ui/separator"
import { ChevronDown, ChevronUp, Code, DollarSign, Wrench } from "lucide-react"
import { useState } from "react"
import { InspectableCode } from "./InspectableCode"

export interface ToolUsageEntry {
  toolName: string
  args: any[]
  text: string
  result: any[]
  toolCost: number
  message_id?: string
}

interface ToolUsageProps {
  toolUsage: ToolUsageEntry[]
}

export const ToolUsage = ({ toolUsage }: ToolUsageProps) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  if (!toolUsage || toolUsage.length === 0) {
    return null
  }

  const totalCost = toolUsage.reduce(
    (sum, usage) => sum + (usage.toolCost || 0),
    0
  )

  const toggleItemExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Wrench size={16} className="text-muted-foreground" />
          <h4 className="text-sm font-medium">
            tool usage ({toolUsage.length})
          </h4>
          {totalCost > 0 && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <DollarSign size={12} />
              <span>${totalCost.toFixed(6)}</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              hide <ChevronUp size={12} className="ml-1" />
            </>
          ) : (
            <>
              show <ChevronDown size={12} className="ml-1" />
            </>
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {toolUsage.map((usage, index) => (
            <Card key={index} className="p-3 bg-muted/20">
              <div className="space-y-2">
                {/* tool name and basic info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="font-mono text-sm font-medium">
                      {usage.toolName || "unknown"}
                    </span>
                    {usage.toolCost > 0 && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        ${usage.toolCost.toFixed(6)}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => toggleItemExpanded(index)}
                  >
                    <Code size={12} />
                  </Button>
                </div>

                {/* text output if present */}
                {usage.text && (
                  <div className="text-sm text-foreground bg-background/50 p-2 rounded border-l-2 border-green-500">
                    {usage.text.length > 120 && !expandedItems.has(index)
                      ? `${usage.text.substring(0, 120)}...`
                      : usage.text}
                  </div>
                )}

                {/* expanded details */}
                {expandedItems.has(index) && (
                  <div className="space-y-3 pt-2">
                    <Separator />

                    {/* arguments */}
                    {usage.args && usage.args.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-xs uppercase text-muted-foreground font-medium">
                          arguments
                        </h5>
                        <InspectableCode
                          content={JSON.stringify(usage.args, null, 2)}
                          title={`${usage.toolName} arguments`}
                        />
                      </div>
                    )}

                    {/* results */}
                    {usage.result && usage.result.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-xs uppercase text-muted-foreground font-medium">
                          results
                        </h5>
                        <InspectableCode
                          content={JSON.stringify(usage.result, null, 2)}
                          title={`${usage.toolName} results`}
                        />
                      </div>
                    )}

                    {/* raw data */}
                    <div className="space-y-1">
                      <h5 className="text-xs uppercase text-muted-foreground font-medium">
                        raw data
                      </h5>
                      <InspectableCode
                        content={JSON.stringify(usage, null, 2)}
                        title={`${usage.toolName} full data`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
