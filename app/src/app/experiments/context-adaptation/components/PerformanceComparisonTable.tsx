"use client"

import { useEffect, useState } from "react"

interface StatisticalResult {
  mean: number
  ci: [number, number]
  n: number
  std: number
}

interface ComparisonRow {
  method:
    | "Vague Prompt"
    | "Clear Prompt"
    | "This Paper (1 Run, Vague)"
    | "This Paper (1 Run, Clear)"
    | "This Paper (3 Runs, Vague)"
    | "This Paper (3 Runs, Clear)"
  model: string
  n: number
  adaptationRate: StatisticalResult
  avgCost: StatisticalResult
  avgDuration: StatisticalResult
  pValue: number | null
  effectSize: number | null
  significant: boolean
}

interface APIResponse {
  success: boolean
  data: ComparisonRow[]
  timestamp: string
  error?: string
}

async function loadPerformanceData(): Promise<ComparisonRow[]> {
  try {
    const response = await fetch(
      "/api/experiments/context-adaptation/performance-comparison",
      {
        cache: "no-store",
      }
    )

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const result: APIResponse = await response.json()

    if (!result.success) {
      throw new Error(result.error || "API request failed")
    }

    return result.data
  } catch (error) {
    console.error("Error loading performance data:", error)
    throw error
  }
}

export default function PerformanceComparisonTable() {
  const [data, setData] = useState<ComparisonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const result = await loadPerformanceData()

        // Filter out specific models from frontend display
        const excludedModels = [
          "gpt-4o-mini",
          "gpt-4o",
          "mistral-small-3.2-24b-instruct",
          "mistralai/mistral-small-3.2-24b-instruct",
          "llama-3.1-8b-instruct",
          "meta-llama/llama-3.1-8b-instruct",
          "gpt-5",
        ]

        const filteredData = result.filter(
          (row) =>
            !excludedModels.some(
              (excluded) =>
                row.model === excluded || row.model.includes(excluded)
            )
        )

        setData(filteredData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
        console.error("Error loading performance comparison data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`
  const formatCurrency = (value: number) => `$${value.toFixed(4)}`
  const formatDuration = (value: number) => `${value.toFixed(1)}s`
  const formatCI = (ci: [number, number], formatter: (n: number) => string) =>
    `[${formatter(ci[0])}, ${formatter(ci[1])}]`
  const formatPValue = (p: number | null) =>
    !p || p >= 1
      ? "1.000"
      : p < 0.001
        ? "<0.001"
        : p < 0.01
          ? "<0.01"
          : p < 0.05
            ? "<0.05"
            : p.toFixed(3)
  const formatEffectSize = (d: number | null) => d?.toFixed(2) || "0.00"

  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">
              Loading performance comparison data...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Error Loading Data
          </h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Adaptive Behavior Performance Comparison
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Statistical comparison of baseline methods vs our iterative learning
          approach across multiple models and scenarios.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
            <p className="text-blue-700">
              <strong>Primary Metric:</strong> Adaptation rate measures
              successful constraint learning and behavioral adjustment
            </p>
          </div>
          <div className="bg-green-50 border-l-4 border-green-400 p-3">
            <p className="text-green-700">
              <strong>Statistical Method:</strong> Bootstrap 95% CI,
              Welch&apos;s t-test, Cohen&apos;s d effect size
            </p>
          </div>
          <div className="bg-purple-50 border-l-4 border-purple-400 p-3">
            <p className="text-purple-700">
              <strong>Significance:</strong> p &lt; 0.05 (green=clear prompts,
              blue=our method vs vague baseline)
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Method
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Model
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                N
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Adaptation Rate
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                95% CI
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Avg Cost
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Avg Duration
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                p-value
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Effect Size
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr
                key={index}
                className={
                  row.significant && row.method.startsWith("This Paper")
                    ? "bg-blue-50 border-l-4 border-blue-500"
                    : row.significant && row.method === "Clear Prompt"
                      ? "bg-green-50 border-l-4 border-green-500"
                      : row.method.startsWith("This Paper")
                        ? "bg-blue-100 border-l-2 border-blue-300"
                        : row.method === "Clear Prompt"
                          ? "bg-gray-50"
                          : ""
                }
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.method}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {row.model}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                  {row.n}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center font-medium">
                  {formatPercentage(row.adaptationRate.mean)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                  {formatCI(row.adaptationRate.ci, formatPercentage)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                  {formatCurrency(row.avgCost.mean)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                  {formatDuration(row.avgDuration.mean)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                  <span
                    className={
                      row.significant && row.method.startsWith("This Paper")
                        ? "text-blue-600 font-semibold"
                        : row.significant
                          ? "text-green-600 font-semibold"
                          : "text-gray-500"
                    }
                  >
                    {row.method === "Vague Prompt"
                      ? "—"
                      : formatPValue(row.pValue)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                  {row.method === "Vague Prompt"
                    ? "—"
                    : formatEffectSize(row.effectSize)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Statistical Notes
            </h4>
            <ul className="space-y-1 text-xs">
              <li>
                • Confidence intervals calculated via bootstrap resampling (1000
                iterations)
              </li>
              <li>• P-values from Welch&apos;s t-test for unequal variances</li>
              <li>
                • Effect sizes using Cohen&apos;s d (0.2=small, 0.5=medium,
                0.8=large)
              </li>
              <li>
                • Green/blue highlighting indicates statistically significant
                improvements
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Interpretation</h4>
            <ul className="space-y-1 text-xs">
              <li>
                • <strong>Adaptation Rate:</strong> % of runs that successfully
                learned constraints and adapted behavior
              </li>
              <li>
                • <strong>Cost:</strong> Average USD spent per experimental run
              </li>
              <li>
                • <strong>Duration:</strong> Average time to complete task
                (seconds)
              </li>
              <li>
                •{" "}
                <strong>
                  Our method shows superior adaptive performance vs both
                  baselines (1 run vs 3 runs comparison)
                </strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
