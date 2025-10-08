"use client"

import { Card } from "@/components/ui/card"
import { isNir } from "@lucky/shared/client"
import { CheckCircle2, ChevronDown, ChevronUp, Copy } from "lucide-react"
import dynamic from "next/dynamic"
import { getReactJsonTheme, getStepIcon, getStepTheme } from "./utils"

const ReactJson = dynamic(() => import("react-json-view"), { ssr: false })

interface TerminateStepProps {
  index: number
  returnData: unknown
  summary?: string
  isExpanded: boolean
  isCollapsed: boolean
  onToggleCollapsed: () => void
  onToggleExpanded: () => void
  setResultRef?: (el: HTMLDivElement | null) => void
}

export const TerminateStep = ({
  index,
  returnData,
  summary,
  isExpanded,
  isCollapsed,
  onToggleCollapsed,
  onToggleExpanded,
  setResultRef,
}: TerminateStepProps) => {
  const hasSummary = !isNir(summary)
  const isError =
    typeof returnData === "string" &&
    (returnData.toLowerCase().includes("error") ||
      returnData.toLowerCase().includes("failed") ||
      returnData.toLowerCase().includes("exception"))

  const theme = getStepTheme("terminate", isError)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (isCollapsed) {
    const text = typeof returnData === "string" ? returnData : JSON.stringify(returnData)
    const truncated = text.length > 80 ? `${text.substring(0, 80)}...` : text
    return (
      <Card
        key={`collapsed-terminate-${index}`}
        className={`p-2 shadow-sm cursor-pointer opacity-75 hover:opacity-90 transition-opacity ${theme.cardClass} border-l-4 border-l-blue-400`}
        onClick={onToggleCollapsed}
      >
        <div className="flex items-center gap-2">
          <div className={`${theme.iconClass}`}>{getStepIcon("terminate")}</div>
          <div className={`text-xs truncate flex-1 ${theme.contentClass}`}>Final Result: {truncated}</div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-blue-600 font-medium">RESULT</span>
            <ChevronDown size={12} className="text-slate-400 dark:text-slate-500" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      key={`terminate-${index}`}
      className={`p-2 shadow-sm ${isExpanded ? "" : "cursor-pointer"} ${theme.cardClass} border-l-4 border-l-blue-400`}
      onClick={
        isExpanded
          ? undefined
          : e => {
              if (e.target === e.currentTarget || !(e.target as Element).closest("button")) {
                onToggleCollapsed()
              }
            }
      }
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`${theme.iconClass}`}>{getStepIcon("terminate")}</div>
            <span className={`${theme.labelClass} text-xs`}>{isError ? "Final Result (Error)" : "Final Result"}</span>
            <span className="text-[10px] text-slate-500 ml-2">(click to view result)</span>
            {!isError && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors duration-200"
              onClick={e => {
                e.stopPropagation()
                copyToClipboard(typeof returnData === "string" ? returnData : JSON.stringify(returnData, null, 2))
              }}
              title="Copy result"
            >
              <Copy size={14} className="text-slate-500 dark:text-slate-400" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors duration-200 cursor-pointer"
              onClick={e => {
                e.stopPropagation()
                onToggleExpanded()
              }}
              title="Toggle details"
            >
              {isExpanded ? (
                <ChevronUp size={14} className="text-slate-500 dark:text-slate-400" />
              ) : (
                <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
              )}
            </button>
          </div>
        </div>

        <div>
          {hasSummary && (
            <div className={`text-sm ${theme.contentClass} bg-slate-50 dark:bg-slate-800 rounded-lg p-2 mb-2`}>
              <span className="font-medium">Summary: </span>
              <span>{summary}</span>
            </div>
          )}

          {isExpanded && (
            <div className="space-y-2">
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-600 to-transparent" />
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2">
                <div className={`text-sm font-medium mb-2 ${theme.contentClass}`}>Complete Result:</div>
                <div ref={setResultRef ?? undefined} className="overflow-hidden">
                  <ReactJson
                    src={typeof returnData === "string" ? { result: returnData } : (returnData as any)}
                    theme={getReactJsonTheme()}
                    collapsed={1}
                    displayObjectSize={false}
                    displayDataTypes={false}
                    enableClipboard={true}
                    style={{ fontSize: "12px" }}
                  />
                </div>
              </div>
            </div>
          )}

          {!isExpanded && (
            <div className="mt-2">
              <button
                type="button"
                className="w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 rounded-lg p-2 text-sm text-blue-700 dark:text-blue-300 font-medium transition-colors"
                onClick={e => {
                  e.stopPropagation()
                  onToggleExpanded()
                }}
              >
                View Full Result
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
