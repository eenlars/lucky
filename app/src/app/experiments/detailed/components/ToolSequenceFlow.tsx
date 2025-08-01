"use client"

import {
  ProcessedData,
  SCENARIO_DESCRIPTIONS as _SCENARIO_DESCRIPTIONS,
} from "./AdaptiveDataProcessor"

interface ToolSequenceFlowProps {
  data: ProcessedData
}

export default function ToolSequenceFlow({ data }: ToolSequenceFlowProps) {
  // Group by pattern type
  const patternGroups = {
    immediate_success: data.toolSequenceData.filter(
      (d) => d.pattern === "immediate_success"
    ),
    successful_chunking: data.toolSequenceData.filter(
      (d) => d.pattern === "successful_chunking"
    ),
    repeated_failures: data.toolSequenceData.filter(
      (d) => d.pattern === "repeated_failures"
    ),
  }

  const getPatternDescription = (pattern: string) => {
    switch (pattern) {
      case "immediate_success":
        return "Single successful call (within limit)"
      case "successful_chunking":
        return "Multiple calls + combine (adaptive success)"
      case "repeated_failures":
        return "Repeated failed attempts (no adaptation)"
      default:
        return pattern
    }
  }

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case "immediate_success":
        return "bg-green-100 text-green-800 border-green-200"
      case "successful_chunking":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "repeated_failures":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Sample sequences for each pattern
  const getSampleSequence = (pattern: string) => {
    const sample = patternGroups[pattern as keyof typeof patternGroups]?.[0]
    if (!sample) return []

    // Simplify sequence for display
    return sample.sequence.slice(0, 4).map((step) => {
      if (step.includes("fetch_objects")) {
        const match = step.match(/count":(\d+)/)
        const count = match ? match[1] : "?"
        return step.includes("_FAIL") ? `fetch(${count})❌` : `fetch(${count})✓`
      } else if (step.includes("combine_results")) {
        return "combine✓"
      }
      return step.substring(0, 15) + "..."
    })
  }

  return (
    <div className="space-y-6">
      {/* Pattern Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">
          Tool Usage Patterns & Adaptation Strategies
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Object.entries(patternGroups).map(([pattern, sequences]) => (
            <div
              key={pattern}
              className={`border-2 rounded-lg p-4 ${getPatternColor(pattern)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">
                  {getPatternDescription(pattern)}
                </h4>
                <span className="text-sm font-medium bg-white px-2 py-1 rounded">
                  {sequences.length} cases
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Sample Sequence:</strong>
                </div>
                <div className="flex flex-wrap gap-1">
                  {getSampleSequence(pattern).map((step, idx) => (
                    <span
                      key={idx}
                      className="bg-white px-2 py-1 rounded text-xs font-mono"
                    >
                      {step}
                    </span>
                  ))}
                  {getSampleSequence(pattern).length > 0 &&
                    patternGroups[pattern as keyof typeof patternGroups]?.[0]
                      ?.sequence.length > 4 && (
                      <span className="text-xs text-gray-500">...</span>
                    )}
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                <div>
                  Success Rate:{" "}
                  {Math.round(
                    (sequences.filter((s) => s.success).length /
                      sequences.length) *
                      100
                  )}
                  %
                </div>
                <div>
                  Most Common in:{" "}
                  {Object.entries(
                    sequences.reduce(
                      (acc, s) => {
                        acc[s.condition] = (acc[s.condition] || 0) + 1
                        return acc
                      },
                      {} as Record<string, number>
                    )
                  )
                    .map(([k, v]) => `${k}(${v})`)
                    .join(", ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Sequence Analysis */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">
          Detailed Tool Call Sequences by Model
        </h3>

        <div className="space-y-6">
          {data.models.map((model) => {
            const modelSequences = data.toolSequenceData.filter(
              (d) => d.model === model
            )
            const vagueSequences = modelSequences.filter(
              (d) => d.condition === "vague"
            )
            const clearSequences = modelSequences.filter(
              (d) => d.condition === "clear"
            )

            return (
              <div
                key={model}
                className="border border-gray-200 rounded-lg p-4"
              >
                <h4 className="font-semibold text-lg mb-4">{model}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vague Prompts */}
                  <div>
                    <h5 className="font-medium text-red-600 mb-3">
                      Vague Prompts
                    </h5>
                    <div className="space-y-3">
                      {vagueSequences.map((seq, idx) => (
                        <div
                          key={idx}
                          className="bg-red-50 border border-red-200 rounded p-3"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                              Pattern: {seq.pattern.replace("_", " ")}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                seq.success
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {seq.success ? "Success" : "Failed"}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-gray-600 space-y-1">
                            {seq.sequence.slice(0, 3).map((step, stepIdx) => (
                              <div key={stepIdx} className="truncate">
                                {stepIdx + 1}. {step}
                              </div>
                            ))}
                            {seq.sequence.length > 3 && (
                              <div className="text-gray-400">
                                ... +{seq.sequence.length - 3} more steps
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clear Prompts */}
                  <div>
                    <h5 className="font-medium text-green-600 mb-3">
                      Clear Prompts
                    </h5>
                    <div className="space-y-3">
                      {clearSequences.map((seq, idx) => (
                        <div
                          key={idx}
                          className="bg-green-50 border border-green-200 rounded p-3"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                              Pattern: {seq.pattern.replace("_", " ")}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                seq.success
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {seq.success ? "Success" : "Failed"}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-gray-600 space-y-1">
                            {seq.sequence.slice(0, 3).map((step, stepIdx) => (
                              <div key={stepIdx} className="truncate">
                                {stepIdx + 1}. {step}
                              </div>
                            ))}
                            {seq.sequence.length > 3 && (
                              <div className="text-gray-400">
                                ... +{seq.sequence.length - 3} more steps
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Key Adaptation Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-600 mb-2">
              Successful Adaptation Patterns
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Break large requests into chunks ≤3 items</li>
              <li>• Use combine_results to aggregate partial results</li>
              <li>• Retry with smaller parameters after failures</li>
              <li>• More common with clear, explicit instructions</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-600 mb-2">
              Common Failure Patterns
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Repeated attempts with same failing parameters</li>
              <li>• No parameter adjustment after errors</li>
              <li>• Lack of chunking strategy for large requests</li>
              <li>• More frequent with vague instructions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
