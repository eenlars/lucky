"use client"

import { SmartContent } from "@/components/utils/SmartContent"
import { Card } from "@/ui/card"
import type { AgentStep } from "@core/messages/pipeline/AgentStep.types"
import { ChevronDown } from "lucide-react"
import { TerminateStep } from "./agent-steps/TerminateStep"
import { ToolStep } from "./agent-steps/ToolStep"
import { getStepIcon, getStepTheme } from "./agent-steps/utils"

export interface AgentStepItemProps {
  index: number
  step: AgentStep
  isCollapsed: boolean
  isExpanded: boolean
  onToggleCollapsed: () => void
  onToggleExpanded: () => void
  setResultRef?: (el: HTMLDivElement | null) => void
}

// theme and icon helpers are imported from agent-steps/utils

const truncate = (content: any, length = 80): string => {
  const text = typeof content === "string" ? content : JSON.stringify(content)
  return text.length > length ? text.substring(0, length) + "..." : text
}

export const AgentStepItem = ({
  index,
  step,
  isCollapsed,
  isExpanded,
  onToggleCollapsed,
  onToggleExpanded,
  setResultRef,
}: AgentStepItemProps) => {
  if (!step) return null

  // collapsed minimal row
  if (isCollapsed) {
    const theme = getStepTheme(step.type)
    return (
      <Card
        key={`collapsed-${step.type}-${index}`}
        className={`p-2 shadow-sm cursor-pointer opacity-75 hover:opacity-90 transition-opacity ${theme.cardClass} ${
          step.type === "terminate" ? "border-l-4 border-l-blue-400" : ""
        }`}
        onClick={onToggleCollapsed}
      >
        <div className="flex items-center gap-2">
          <div className={`${theme.iconClass}`}>{getStepIcon(step.type)}</div>
          <div className={`text-xs truncate flex-1 ${theme.contentClass}`}>
            {step.type === "terminate" ? "Final Result: " : ""}
            {truncate((step as any).return || "")}
          </div>
          <div className="flex items-center gap-1">
            {step.type === "terminate" && <span className="text-[9px] text-blue-600 font-medium">RESULT</span>}
            <ChevronDown size={12} className="text-slate-400 dark:text-slate-500" />
          </div>
        </div>
      </Card>
    )
  }

  // expanded variants for simple text-like steps
  const simpleStepLabels: Record<string, string> = {
    reasoning: "Reasoning",
    plan: "Planning",
    learning: "Learning",
    text: "Message",
  }
  if (step.type in simpleStepLabels) {
    const theme = getStepTheme(step.type)
    return (
      <Card
        key={`${step.type}-${index}`}
        className={`p-2 shadow-sm cursor-pointer ${theme.cardClass}`}
        onClick={onToggleCollapsed}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`${theme.iconClass}`}>{getStepIcon(step.type)}</div>
            <span className={`${theme.labelClass} text-xs`}>{simpleStepLabels[step.type]}</span>
          </div>
          <div className={`text-sm leading-relaxed whitespace-pre-wrap ${theme.contentClass}`}>
            {(step as any).return}
          </div>
        </div>
      </Card>
    )
  }

  if (step.type === "terminate") {
    const returnData: any = (step as any).return
    return (
      <TerminateStep
        index={index}
        returnData={returnData}
        summary={(step as any).summary}
        isExpanded={isExpanded}
        isCollapsed={isCollapsed}
        onToggleCollapsed={onToggleCollapsed}
        onToggleExpanded={onToggleExpanded}
        setResultRef={setResultRef}
      />
    )
  }

  // text is already handled in simpleStepLabels branch above

  if (step.type === "error") {
    const theme = getStepTheme(step.type, true)
    return (
      <Card
        key={`error-${index}`}
        className={`p-3 shadow-sm cursor-pointer ${theme.cardClass}`}
        onClick={onToggleCollapsed}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${theme.iconClass}`}>{getStepIcon(step.type)}</div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${theme.labelClass}`}>Error</span>
            </div>
            <div
              className={`text-sm leading-relaxed whitespace-pre-wrap ${theme.contentClass}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <SmartContent value={(step as any).return} collapsed={1} enableClipboard showExpanders jsonTheme="auto" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (step.type === "tool") {
    return (
      <ToolStep
        index={index}
        name={(step as any).name}
        args={(step as any).args}
        result={(step as any).return}
        summary={(step as any).summary}
        isExpanded={isExpanded}
        isCollapsed={isCollapsed}
        onToggleCollapsed={onToggleCollapsed}
        onToggleExpanded={onToggleExpanded}
        setResultRef={setResultRef}
      />
    )
  }

  // Fallback/unknown step type (e.g., prepare)
  const themeUnknown = getStepTheme((step as any).type)
  return (
    <Card
      key={`unknown-${index}`}
      className={`p-2 shadow-sm cursor-pointer ${themeUnknown.cardClass}`}
      onClick={onToggleCollapsed}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className={`${themeUnknown.iconClass}`}>{getStepIcon((step as any).type)}</div>
          <span className={`${themeUnknown.labelClass} text-xs`}>{(step as any).type}</span>
        </div>
        {(step as any).return && (
          <div className={`text-sm leading-relaxed whitespace-pre-wrap ${themeUnknown.contentClass}`}>
            {typeof (step as any).return === "string"
              ? (step as any).return
              : JSON.stringify((step as any).return, null, 2)}
          </div>
        )}
      </div>
    </Card>
  )
}
