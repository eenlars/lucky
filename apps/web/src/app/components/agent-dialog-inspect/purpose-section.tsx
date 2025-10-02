"use client"

import type { AppNode } from "@/react-flow-visualization/components/nodes"
import { useAppStore } from "@/react-flow-visualization/store"
import { ArrowRight } from "lucide-react"
import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

interface PurposeSectionProps {
  node: AppNode
}

export function PurposeSection({ node }: PurposeSectionProps) {
  const { edges } = useAppStore(
    useShallow(state => ({
      edges: state.edges,
    })),
  )

  // Get connections for this node
  const connections = useMemo(() => {
    const incoming = edges.filter(e => e.target === node.id)
    const outgoing = edges.filter(e => e.source === node.id)

    const from = incoming.map(e => e.source).filter(id => id !== "start")
    const to = outgoing.map(e => e.target).filter(id => id !== "end")

    return {
      from: from.length > 0 ? from : incoming.length > 0 ? ["start"] : [],
      to: to.length > 0 ? to : outgoing.length > 0 ? ["end"] : [],
    }
  }, [edges, node.id])

  // Generate plain language purpose from description and systemPrompt
  const purpose = useMemo(() => {
    if (node.data.description && node.data.description !== "Main workflow node") {
      return node.data.description
    }

    // Try to infer from systemPrompt
    if (node.data.systemPrompt) {
      const firstSentence = node.data.systemPrompt.split(".")[0]
      if (firstSentence && firstSentence.length < 200) {
        return firstSentence + "."
      }
    }

    // Fallback based on tools
    const mcpTools = node.data.mcpTools || []
    const codeTools = node.data.codeTools || []
    const allTools = [...mcpTools, ...codeTools]

    if (allTools.length > 0) {
      if (allTools.some(tool => tool.includes("search"))) {
        return "This agent searches the web and processes results."
      }
      if (allTools.some(tool => tool.includes("read"))) {
        return "This agent reads and analyzes files."
      }
      if (allTools.some(tool => tool.includes("write"))) {
        return "This agent creates or modifies files."
      }
      return `This agent uses ${allTools.length} tools to process requests.`
    }

    // Generic fallback
    return "This agent processes requests in the workflow."
  }, [node.data])

  // Calculate estimated cost per run
  const estimatedCost = useMemo(() => {
    // Simple estimate: ~1000 tokens in, ~500 tokens out on average
    // This should be calculated based on actual usage later
    return "$0.02"
  }, [])

  return (
    <div className="space-y-4">
      {/* What this does */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="text-base">🎯</span>
          What this does
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{purpose}</p>
      </div>

      {/* Connected in workflow */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="text-base">🔗</span>
          Connected
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          {connections.from.length > 0 && (
            <>
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {connections.from.join(", ")}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
          <span className="font-mono text-xs bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded font-medium">
            {node.id}
          </span>
          {connections.to.length > 0 && (
            <>
              <ArrowRight className="w-4 h-4" />
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {connections.to.join(", ")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Capabilities */}
      {(() => {
        const allTools = [...(node.data.mcpTools || []), ...(node.data.codeTools || [])]
        if (allTools.length === 0) return null

        return (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="text-base">🔧</span>
              Capabilities
            </h3>
            <div className="flex flex-wrap gap-2">
              {allTools.map((tool: string) => {
                // Convert tool ID to human readable
                const readable = tool.includes("search")
                  ? "🔍 Can search the web"
                  : tool.includes("read")
                    ? "📖 Can read files"
                    : tool.includes("write")
                      ? "✏️ Can write files"
                      : tool.includes("run")
                        ? "⚡ Can execute code"
                        : `Uses ${tool}`

                return (
                  <span
                    key={tool}
                    className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
                  >
                    {readable}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Performance */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>⚡ ~2s response time</span>
        <span>💰 ~{estimatedCost} per run</span>
        {node.data.modelName && <span>🤖 {node.data.modelName.split("/").pop()}</span>}
      </div>
    </div>
  )
}
