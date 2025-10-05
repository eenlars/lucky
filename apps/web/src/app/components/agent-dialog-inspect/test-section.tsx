"use client"

import { cn } from "@/lib/utils"
import type { AppNode } from "@/react-flow-visualization/components/nodes/nodes"
import { AlertCircle, CheckCircle, Play } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

interface TestSectionProps {
  node: AppNode
}

export function TestSection({ node }: TestSectionProps) {
  const [testInput, setTestInput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasRun, setHasRun] = useState(false)

  // Generate example inputs based on agent purpose
  const exampleInputs = useMemo(() => {
    const mcpTools = node.data.mcpTools || []
    const codeTools = node.data.codeTools || []
    const allTools = [...mcpTools, ...codeTools]

    if (allTools.some(tool => tool.includes("search"))) {
      return ["Search for recent developments in AI", "Find information about climate change solutions"]
    }

    if (allTools.some(tool => tool.includes("read"))) {
      return ["Analyze the main.py file for potential issues", "Summarize the README documentation"]
    }

    if (node.data.description?.toLowerCase().includes("email")) {
      return ["Draft a response to a customer inquiry", "Write a follow-up email about the meeting"]
    }

    // Generic examples
    return ["Test this agent with your specific use case", "Enter a request to see how this agent responds"]
  }, [node.data])

  const handleRun = useCallback(async () => {
    if (!testInput.trim() || isRunning) return

    setIsRunning(true)
    setError(null)
    setOutput(null)
    setHasRun(true)

    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/agent/test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ nodeId: node.id, input: testInput }),
      // })

      // Simulate API response for now
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock response based on input
      const mockOutput = testInput.toLowerCase().includes("search")
        ? "Found 5 relevant results:\n\n1. Latest AI breakthrough in natural language processing\n2. GPT-4 capabilities and applications\n3. Ethical considerations in AI development\n4. Open source AI models gaining traction\n5. Industry adoption of AI technologies"
        : testInput.toLowerCase().includes("email")
          ? `Subject: Re: Your Inquiry\n\nDear Customer,\n\nThank you for reaching out. I'd be happy to help with your request.\n\n${testInput}\n\nBased on your message, here's what I recommend:\n1. Review our documentation at docs.example.com\n2. Try the quick start guide\n3. Contact support if you need additional assistance\n\nBest regards,\nYour AI Assistant`
          : `Processing: "${testInput}"\n\nThis agent successfully processed your request. In production, this would show the actual output from running the agent with your input.\n\nThe agent used its configured tools and model to generate this response.`

      setOutput(mockOutput)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run test")
    } finally {
      setIsRunning(false)
    }
  }, [testInput, node.id])

  const handleExampleClick = useCallback(
    (example: string) => {
      setTestInput(example)
      // Auto-run after setting example
      setTimeout(() => {
        setTestInput(example)
        handleRun()
      }, 100)
    },
    [handleRun],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleRun()
    }
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="text-base">▶</span>
          Test it now
        </h3>
        {hasRun && output && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Last test succeeded
          </span>
        )}
      </div>

      {/* Example Inputs */}
      {!hasRun && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Quick examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleInputs.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(example)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-md transition-colors"
              >
                → {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Test Input */}
      <div className="flex gap-2">
        <textarea
          value={testInput}
          onChange={e => setTestInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasRun
              ? "Try another test..."
              : "Paste an email you received, describe what you want to test, or click an example above..."
          }
          rows={3}
          className="flex-1 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none transition-all leading-relaxed"
          disabled={isRunning}
        />
        <button
          onClick={handleRun}
          disabled={!testInput.trim() || isRunning}
          className={cn(
            "px-6 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-2 self-end",
            testInput.trim() && !isRunning
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed",
          )}
          title="Run test (⌘↵)"
        >
          <Play className="w-4 h-4" />
          {isRunning ? "Running..." : "Run"}
        </button>
      </div>

      {/* Output */}
      {(output || error || isRunning) && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Output</h4>
          <div
            className={cn(
              "rounded-md border p-4 min-h-[120px] max-h-[300px] overflow-y-auto",
              error
                ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50",
            )}
          >
            {isRunning && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                Running test...
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
            {output && (
              <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono">{output}</pre>
            )}
          </div>
        </div>
      )}

      {/* Working as expected? */}
      {hasRun && output && !error && (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
          <span className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Working as expected?
          </span>
          <div className="flex gap-2">
            <button
              className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              onClick={() => {
                // Close dialog or move to next task
                console.log("User confirmed it works")
              }}
            >
              Yes, looks good
            </button>
            <button
              className="text-sm px-3 py-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md transition-colors"
              onClick={() => {
                // Expand configuration section
                console.log("User wants to adjust")
              }}
            >
              Needs adjustment
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
