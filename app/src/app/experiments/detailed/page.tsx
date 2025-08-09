"use client"

import {
  modelColors,
  semantic,
  stepColors,
} from "@/app/experiments/chartColors"
import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import AdaptiveExperimentVisualization from "./components/AdaptiveExperimentVisualization"

// Define types for our data
interface AdaptiveRun {
  model: string
  condition: string
  run_number: number
  items_retrieved: number
  target_items: number
  adapted: boolean
  strategy: string
  attempts: number
  success_rate: string
}

interface SequentialRun {
  model: string
  chain_type: string
  steps: number
  score: number
  duration_ms: number
  status: string
}

export default function DetailedExperimentsPage() {
  const [adaptiveData, setAdaptiveData] = useState<AdaptiveRun[]>([])
  const [sequentialData, setSequentialData] = useState<SequentialRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load CSV data - in production, this would be an API call
    // For now, using the data we know from the CSV files
    const adaptiveRuns: AdaptiveRun[] = [
      // gpt-3.5-turbo vague runs
      {
        model: "gpt-3.5-turbo",
        condition: "vague",
        run_number: 1,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 3,
        success_rate: "success",
      },
      {
        model: "gpt-3.5-turbo",
        condition: "vague",
        run_number: 2,
        items_retrieved: 0,
        target_items: 5,
        adapted: false,
        strategy: "no-success",
        attempts: 4,
        success_rate: "fail",
      },
      {
        model: "gpt-3.5-turbo",
        condition: "vague",
        run_number: 3,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 3,
        success_rate: "success",
      },
      // gpt-3.5-turbo clear runs
      {
        model: "gpt-3.5-turbo",
        condition: "clear",
        run_number: 1,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 3,
        success_rate: "success",
      },
      {
        model: "gpt-3.5-turbo",
        condition: "clear",
        run_number: 2,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 3,
        success_rate: "success",
      },
      {
        model: "gpt-3.5-turbo",
        condition: "clear",
        run_number: 3,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 3,
        success_rate: "success",
      },
      // gpt-4o-mini vague runs
      {
        model: "gpt-4o-mini",
        condition: "vague",
        run_number: 1,
        items_retrieved: 0,
        target_items: 5,
        adapted: false,
        strategy: "no-success",
        attempts: 3,
        success_rate: "fail",
      },
      {
        model: "gpt-4o-mini",
        condition: "vague",
        run_number: 2,
        items_retrieved: 0,
        target_items: 5,
        adapted: false,
        strategy: "no-success",
        attempts: 3,
        success_rate: "fail",
      },
      {
        model: "gpt-4o-mini",
        condition: "vague",
        run_number: 3,
        items_retrieved: 0,
        target_items: 5,
        adapted: false,
        strategy: "no-success",
        attempts: 3,
        success_rate: "fail",
      },
      // gpt-4o-mini clear runs
      {
        model: "gpt-4o-mini",
        condition: "clear",
        run_number: 1,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 2,
        success_rate: "success",
      },
      {
        model: "gpt-4o-mini",
        condition: "clear",
        run_number: 2,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 2,
        success_rate: "success",
      },
      {
        model: "gpt-4o-mini",
        condition: "clear",
        run_number: 3,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 2,
        success_rate: "success",
      },
      // gpt-4-turbo vague runs
      {
        model: "gpt-4-turbo",
        condition: "vague",
        run_number: 1,
        items_retrieved: 0,
        target_items: 5,
        adapted: false,
        strategy: "no-success",
        attempts: 3,
        success_rate: "fail",
      },
      {
        model: "gpt-4-turbo",
        condition: "vague",
        run_number: 2,
        items_retrieved: 0,
        target_items: 5,
        adapted: false,
        strategy: "no-success",
        attempts: 3,
        success_rate: "fail",
      },
      {
        model: "gpt-4-turbo",
        condition: "vague",
        run_number: 3,
        items_retrieved: 0,
        target_items: 5,
        adapted: false,
        strategy: "no-success",
        attempts: 3,
        success_rate: "fail",
      },
      // gpt-4-turbo clear runs
      {
        model: "gpt-4-turbo",
        condition: "clear",
        run_number: 1,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 2,
        success_rate: "success",
      },
      {
        model: "gpt-4-turbo",
        condition: "clear",
        run_number: 2,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 2,
        success_rate: "success",
      },
      {
        model: "gpt-4-turbo",
        condition: "clear",
        run_number: 3,
        items_retrieved: 5,
        target_items: 5,
        adapted: true,
        strategy: "optimal-split",
        attempts: 2,
        success_rate: "success",
      },
    ]

    const sequentialRuns: SequentialRun[] = [
      {
        model: "gpt-3.5-turbo",
        chain_type: "math",
        steps: 2,
        score: 1.0,
        duration_ms: 4357,
        status: "success",
      },
      {
        model: "gpt-3.5-turbo",
        chain_type: "document",
        steps: 5,
        score: 1.0,
        duration_ms: 21240,
        status: "success",
      },
      {
        model: "gpt-3.5-turbo",
        chain_type: "business",
        steps: 10,
        score: 1.0,
        duration_ms: 49908,
        status: "success",
      },
      {
        model: "o3",
        chain_type: "math",
        steps: 2,
        score: 1.0,
        duration_ms: 8927,
        status: "success",
      },
      {
        model: "o3",
        chain_type: "document",
        steps: 5,
        score: 1.0,
        duration_ms: 13641,
        status: "success",
      },
      {
        model: "o3",
        chain_type: "business",
        steps: 10,
        score: 0.0,
        duration_ms: 0,
        status: "timeout",
      },
      {
        model: "gpt-4-turbo",
        chain_type: "math",
        steps: 2,
        score: 1.0,
        duration_ms: 4006,
        status: "success",
      },
      {
        model: "gpt-4-turbo",
        chain_type: "document",
        steps: 5,
        score: 1.0,
        duration_ms: 14130,
        status: "success",
      },
      {
        model: "gpt-4-turbo",
        chain_type: "business",
        steps: 10,
        score: 0.7,
        duration_ms: 25354,
        status: "partial",
      },
    ]

    setAdaptiveData(adaptiveRuns)
    setSequentialData(sequentialRuns)
    setLoading(false)
  }, [])

  // Process data for visualizations
  const _strategyDistribution = adaptiveData.reduce(
    (acc, run) => {
      const key = `${run.model}-${run.condition}`
      if (!acc[key])
        acc[key] = {
          model: run.model,
          condition: run.condition,
          strategies: {},
        }
      acc[key].strategies[run.strategy] =
        (acc[key].strategies[run.strategy] || 0) + 1
      return acc
    },
    {} as Record<string, any>
  )

  const _scatterData = adaptiveData.map((run) => ({
    x: run.attempts,
    y: run.items_retrieved,
    model: run.model,
    condition: run.condition,
    strategy: run.strategy,
  }))

  const _performanceBySteps = sequentialData.reduce(
    (acc, run) => {
      const key = run.steps
      if (!acc[key]) acc[key] = { steps: key, models: {} }
      acc[key].models[run.model] = run.score * 100
      return acc
    },
    {} as Record<number, any>
  )

  const _colors = modelColors

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Detailed Experimental Analysis
        </h1>

        {/* NEW: Comprehensive Adaptive Behavior Analysis */}
        <AdaptiveExperimentVisualization />

        {/* ORIGINAL: Adaptive Behavior Analysis */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">
            Legacy Adaptive Behavior Analysis (Original Data)
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Average attempts by model and condition */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Average Attempts by Model & Condition
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={(() => {
                    const models = [
                      "gpt-3.5-turbo",
                      "gpt-4o-mini",
                      "gpt-4-turbo",
                    ]
                    return models.map((model) => {
                      const vagueRuns = adaptiveData.filter(
                        (d) => d.model === model && d.condition === "vague"
                      )
                      const clearRuns = adaptiveData.filter(
                        (d) => d.model === model && d.condition === "clear"
                      )
                      const vagueAvg =
                        vagueRuns.reduce((sum, r) => sum + r.attempts, 0) /
                        vagueRuns.length
                      const clearAvg =
                        clearRuns.reduce((sum, r) => sum + r.attempts, 0) /
                        clearRuns.length
                      return {
                        model,
                        "Vague Prompt": vagueAvg,
                        "Clear Prompt": clearAvg,
                      }
                    })
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Vague Prompt" fill={semantic.negative} />
                  <Bar dataKey="Clear Prompt" fill={semantic.positive} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-600 mt-2">
                Lower attempts indicate better efficiency. Clear prompts
                consistently require fewer attempts.
              </p>
            </div>

            {/* Strategy distribution */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Strategy Distribution by Model
              </h3>
              <div className="space-y-4">
                {["gpt-3.5-turbo", "gpt-4o-mini", "gpt-4-turbo"].map(
                  (model) => {
                    const vagueCount = adaptiveData.filter(
                      (d) =>
                        d.model === model &&
                        d.condition === "vague" &&
                        d.strategy === "optimal-split"
                    ).length
                    const clearCount = adaptiveData.filter(
                      (d) =>
                        d.model === model &&
                        d.condition === "clear" &&
                        d.strategy === "optimal-split"
                    ).length
                    return (
                      <div key={model} className="space-y-2">
                        <div className="font-medium">{model}</div>
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <div className="text-sm text-gray-600">
                              Vague: Optimal Split
                            </div>
                            <div className="bg-gray-200 rounded-full h-4 relative">
                              <div
                                className="bg-red-500 h-4 rounded-full absolute"
                                style={{ width: `${(vagueCount / 3) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-600">
                              Clear: Optimal Split
                            </div>
                            <div className="bg-gray-200 rounded-full h-4 relative">
                              <div
                                className="bg-green-500 h-4 rounded-full absolute"
                                style={{ width: `${(clearCount / 3) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            </div>
          </div>

          {/* Success/Failure Pattern Visualization */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Individual Run Results
            </h3>
            <div className="space-y-4">
              {["gpt-3.5-turbo", "gpt-4o-mini", "gpt-4-turbo"].map((model) => (
                <div key={model} className="space-y-2">
                  <h4 className="font-medium">{model}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        Vague Prompt Runs
                      </div>
                      <div className="flex space-x-1">
                        {adaptiveData
                          .filter(
                            (d) => d.model === model && d.condition === "vague"
                          )
                          .map((run, idx) => (
                            <div
                              key={idx}
                              className={`w-12 h-8 rounded flex items-center justify-center text-xs font-medium ${
                                run.adapted
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                              title={`Run ${run.run_number}: ${run.items_retrieved}/${run.target_items} items, ${run.attempts} attempts`}
                            >
                              {run.items_retrieved}/{run.target_items}
                            </div>
                          ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        Clear Prompt Runs
                      </div>
                      <div className="flex space-x-1">
                        {adaptiveData
                          .filter(
                            (d) => d.model === model && d.condition === "clear"
                          )
                          .map((run, idx) => (
                            <div
                              key={idx}
                              className={`w-12 h-8 rounded flex items-center justify-center text-xs font-medium ${
                                run.adapted
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                              title={`Run ${run.run_number}: ${run.items_retrieved}/${run.target_items} items, ${run.attempts} attempts`}
                            >
                              {run.items_retrieved}/{run.target_items}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sequential Execution Analysis */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">
            Sequential Execution Analysis
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance by Chain Complexity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Success Rate by Chain Length
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={(() => {
                    const models = ["gpt-3.5-turbo", "gpt-4-turbo", "o3"]
                    return models.map((model) => {
                      const modelData = sequentialData.filter(
                        (d) => d.model === model
                      )
                      return {
                        model,
                        "2-step":
                          (modelData.find((d) => d.steps === 2)?.score ?? 0) *
                          100,
                        "5-step":
                          (modelData.find((d) => d.steps === 5)?.score ?? 0) *
                          100,
                        "10-step":
                          (modelData.find((d) => d.steps === 10)?.score ?? 0) *
                          100,
                      }
                    })
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="2-step" fill={stepColors["2-step"]} />
                  <Bar dataKey="5-step" fill={stepColors["5-step"]} />
                  <Bar dataKey="10-step" fill={stepColors["10-step"]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-600 mt-2">
                gpt-3.5-turbo maintains 100% success across all chain lengths
              </p>
            </div>

            {/* Execution Time Analysis */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Execution Time by Chain Length
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={(() => {
                    const stepData = [2, 5, 10].map((steps) => {
                      const runsForStep = sequentialData.filter(
                        (d) => d.steps === steps && d.duration_ms > 0
                      )
                      return {
                        steps: `${steps}-step`,
                        "gpt-3.5-turbo":
                          runsForStep.find((d) => d.model === "gpt-3.5-turbo")
                            ?.duration_ms || 0,
                        "gpt-4-turbo":
                          runsForStep.find((d) => d.model === "gpt-4-turbo")
                            ?.duration_ms || 0,
                        o3:
                          runsForStep.find((d) => d.model === "o3")
                            ?.duration_ms || 0,
                      }
                    })
                    return stepData
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="steps" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      `${((value as number) / 1000).toFixed(1)}s`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="gpt-3.5-turbo"
                    stroke={modelColors["gpt-3.5-turbo"]}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="gpt-4-turbo"
                    stroke={modelColors["gpt-4-turbo"]}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="o3"
                    stroke={modelColors["o3"]}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-600 mt-2">
                o3 timed out on 10-step chain. Times shown in seconds.
              </p>
            </div>
          </div>

          {/* Sequential Execution Status Grid */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">
              Execution Status by Model and Chain
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Model</th>
                    <th className="text-center py-2">2-step (Math)</th>
                    <th className="text-center py-2">5-step (Document)</th>
                    <th className="text-center py-2">10-step (Business)</th>
                  </tr>
                </thead>
                <tbody>
                  {["gpt-3.5-turbo", "gpt-4-turbo", "o3"].map((model) => (
                    <tr key={model} className="border-b">
                      <td className="py-3 font-medium">{model}</td>
                      {[2, 5, 10].map((steps) => {
                        const run = sequentialData.find(
                          (d) => d.model === model && d.steps === steps
                        )
                        if (!run)
                          return (
                            <td key={steps} className="text-center py-3">
                              -
                            </td>
                          )

                        const bgColor =
                          run.status === "success"
                            ? "bg-green-100"
                            : run.status === "partial"
                              ? "bg-yellow-100"
                              : "bg-red-100"
                        const textColor =
                          run.status === "success"
                            ? "text-green-800"
                            : run.status === "partial"
                              ? "text-yellow-800"
                              : "text-red-800"

                        return (
                          <td key={steps} className="text-center py-3">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${bgColor} ${textColor}`}
                            >
                              {run.status === "success"
                                ? "✓ 100%"
                                : run.status === "partial"
                                  ? `⚠ ${(run.score * 100).toFixed(0)}%`
                                  : "✗ Timeout"}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Statistical Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Statistical Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">
                Adaptive Behavior Experiment
              </h3>
              <ul className="space-y-1 text-sm">
                <li>Total runs: {adaptiveData.length}</li>
                <li>Models tested: 3</li>
                <li>Conditions: 2 (vague vs clear)</li>
                <li>Runs per condition: 3</li>
                <li>
                  Overall vague success:{" "}
                  {
                    adaptiveData.filter(
                      (d) => d.condition === "vague" && d.adapted
                    ).length
                  }
                  /{adaptiveData.filter((d) => d.condition === "vague").length}
                </li>
                <li>
                  Overall clear success:{" "}
                  {
                    adaptiveData.filter(
                      (d) => d.condition === "clear" && d.adapted
                    ).length
                  }
                  /{adaptiveData.filter((d) => d.condition === "clear").length}
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">
                Sequential Execution Experiment
              </h3>
              <ul className="space-y-1 text-sm">
                <li>Total runs: {sequentialData.length}</li>
                <li>Models tested: 3</li>
                <li>Chain types: 3 (2-step, 5-step, 10-step)</li>
                <li>
                  Perfect scores:{" "}
                  {sequentialData.filter((d) => d.score === 1.0).length}/
                  {sequentialData.length}
                </li>
                <li>
                  Timeouts:{" "}
                  {sequentialData.filter((d) => d.status === "timeout").length}
                </li>
                <li>
                  Average duration:{" "}
                  {Math.round(
                    sequentialData
                      .filter((d) => d.duration_ms > 0)
                      .reduce((sum, d) => sum + d.duration_ms, 0) /
                      sequentialData.filter((d) => d.duration_ms > 0).length
                  )}
                  ms
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
