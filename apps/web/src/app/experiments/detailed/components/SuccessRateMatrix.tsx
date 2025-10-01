"use client"

import { semantic } from "@/app/experiments/chartColors"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ProcessedData } from "./AdaptiveDataProcessor"

interface SuccessRateMatrixProps {
  data: ProcessedData
}

export default function SuccessRateMatrix({ data }: SuccessRateMatrixProps) {
  const matrixData = data.successRateMatrix.map(item => ({
    model: item.model.replace("gpt-", ""),
    "Standard Method": item.vague,
    "Our solution": item.clear,
    improvement: item.improvement,
  }))

  // Custom tooltip to show the key insight
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const vagueValue = payload.find((p: any) => p.dataKey === "Standard Method")?.value || 0
      const clearValue = payload.find((p: any) => p.dataKey === "Our solution")?.value || 0
      const improvement = clearValue - vagueValue

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-red-600">Standard Method: {vagueValue.toFixed(0)}%</p>
          <p className="text-green-600">Our solution: {clearValue.toFixed(0)}%</p>
          <p className="text-blue-600 font-medium">Improvement: +{improvement.toFixed(0)}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Success Rate: Standard Method vs Our solution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
            <p className="text-sm text-blue-700">
              <strong>Key Finding:</strong> We only found that GPT-3.5-turbo showed adaptive behavior with Standard
              Method (50% success rate)
            </p>
          </div>
          <div className="bg-green-50 border-l-4 border-green-400 p-3">
            <p className="text-sm text-green-700">
              <strong>Universal Success:</strong> All models achieved 100% success with our solution
            </p>
          </div>
          <div className="bg-purple-50 border-l-4 border-purple-400 p-3">
            <p className="text-sm text-purple-700">
              <strong>Critical Factor:</strong> Prompt clarity is the determining factor for successful tool adaptation
            </p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={matrixData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="model" tick={{ fontSize: 12 }} interval={0} />
          <YAxis
            domain={[0, 100]}
            label={{
              value: "Success Rate (%)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="Standard Method" fill={semantic.negative} name="Standard Method" radius={[2, 2, 0, 0]} />
          <Bar dataKey="Our solution" fill={semantic.positive} name="Our solution" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Analysis:</strong> The dramatic improvement from our solution suggests that adaptive behavior requires
          explicit guidance about tool constraints and failure recovery strategies.
        </p>
      </div>
    </div>
  )
}
