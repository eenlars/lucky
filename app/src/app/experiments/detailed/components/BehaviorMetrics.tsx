"use client"

import { semantic } from "@/app/experiments/chartColors"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ProcessedData } from "./AdaptiveDataProcessor"

interface BehaviorMetricsProps {
  data: ProcessedData
}

export default function BehaviorMetrics({ data }: BehaviorMetricsProps) {
  // Process data for retry attempts analysis
  const retryData = data.models.map((model) => {
    const vagueAttempts =
      data.behaviorMetrics
        .filter((d) => d.model === model && d.condition === "vague")
        .reduce((sum, d) => sum + d.retryAttempts, 0) /
      data.behaviorMetrics.filter(
        (d) => d.model === model && d.condition === "vague"
      ).length

    const clearAttempts =
      data.behaviorMetrics
        .filter((d) => d.model === model && d.condition === "clear")
        .reduce((sum, d) => sum + d.retryAttempts, 0) /
      data.behaviorMetrics.filter(
        (d) => d.model === model && d.condition === "clear"
      ).length

    return {
      model: model.replace("gpt-", ""),
      "Standard Method": Math.round(vagueAttempts * 10) / 10,
      "Our solution": Math.round(clearAttempts * 10) / 10,
    }
  })

  // Process data for tool call efficiency scatter plot
  const scatterData = data.behaviorMetrics.map((d, index) => ({
    x: d.toolCalls,
    y: d.finalCount,
    model: d.model,
    condition: d.condition,
    success: d.success,
    id: index,
  }))

  const getScatterColor = (condition: string, success: boolean) => {
    if (condition === "vague") {
      return success ? semantic.positive : semantic.negative
    } else {
      return success ? semantic.positiveEmphasis : semantic.negativeEmphasis
    }
  }

  // Tool call efficiency data
  const efficiencyData = data.models.map((model) => {
    const modelData = data.behaviorMetrics.filter((d) => d.model === model)
    const avgToolCalls =
      modelData.reduce((sum, d) => sum + d.toolCalls, 0) / modelData.length
    const successRate =
      (modelData.filter((d) => d.success).length / modelData.length) * 100

    return {
      model: model.replace("gpt-", ""),
      avgToolCalls: Math.round(avgToolCalls * 10) / 10,
      successRate: Math.round(successRate),
    }
  })

  return (
    <div className="space-y-6">
      {/* Retry Attempts Analysis */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">
          Average Retry Attempts by Model & Condition
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={retryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="model" />
            <YAxis
              label={{
                value: "Avg Retry Attempts",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip />
            <Legend />
            <Bar dataKey="OLD method" fill={semantic.negative} />
            <Bar dataKey="Our solution" fill={semantic.positive} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-600 mt-2">
          Higher retry attempts indicate more struggle with adaptation. Our
          solution consistently requires fewer retries.
        </p>
      </div>

      {/* Tool Call Efficiency Scatter Plot */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">
          Tool Call Efficiency: Calls vs Final Results
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Tool Calls"
              label={{
                value: "Total Tool Calls",
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Final Count"
              label={{
                value: "Objects Retrieved",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-semibold">{data.model}</p>
                      <p>Condition: {data.condition}</p>
                      <p>Tool Calls: {data.x}</p>
                      <p>Objects Retrieved: {data.y}</p>
                      <p
                        className={`font-medium ${data.success ? "text-green-600" : "text-red-600"}`}
                      >
                        {data.success
                          ? "Successful Strategy"
                          : "Failed Strategy"}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Scatter data={scatterData} fill={semantic.info}>
              {scatterData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getScatterColor(entry.condition, entry.success)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>OLD method Success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>OLD method Failure</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-700 rounded-full"></div>
            <span>Our solution Success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-700 rounded-full"></div>
            <span>Our solution Failure</span>
          </div>
        </div>
      </div>

      {/* Model Efficiency Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Model Efficiency Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {efficiencyData.map((model) => (
            <div
              key={model.model}
              className="text-center p-4 bg-gray-50 rounded-lg"
            >
              <h4 className="font-medium text-gray-900 mb-2">{model.model}</h4>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {model.avgToolCalls}
              </div>
              <div className="text-sm text-gray-600 mb-2">Avg Tool Calls</div>
              <div className="text-lg font-semibold text-green-600">
                {model.successRate}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
