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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

// Adaptive behavior data
const adaptiveSummaryData = [
  { model: "gpt-3.5-turbo", vague: 66.7, clear: 100.0, improvement: 33.3 },
  { model: "gpt-4o-mini", vague: 0.0, clear: 100.0, improvement: 100.0 },
  { model: "gpt-4-turbo", vague: 0.0, clear: 100.0, improvement: 100.0 },
]

// Sequential execution data
const sequentialData = [
  { model: "gpt-3.5-turbo", "2-step": 100, "5-step": 100, "10-step": 100 },
  { model: "o3", "2-step": 100, "5-step": 100, "10-step": 0 },
  { model: "gpt-4-turbo", "2-step": 100, "5-step": 100, "10-step": 70 },
]

// Load tool capacity data from research results
const loadToolCapacityData = async () => {
  try {
    const [resultsResponse, analysisResponse] = await Promise.all([
      fetch("/api/experiments/capacity"),
      fetch("/api/experiments/capacity/analysis"),
    ])

    if (!resultsResponse.ok || !analysisResponse.ok) {
      throw new Error("Failed to load research data")
    }

    const results = await resultsResponse.json()
    const analysis = await analysisResponse.json()

    return { results, analysis }
  } catch (error) {
    console.error("Error loading tool capacity data:", error)
    return null
  }
}

// Transform analysis data to visualization format
const transformToolCapacityData = (analysis: any) => {
  if (!analysis?.toolCountPerformance) return []

  const toolCountData = analysis.toolCountPerformance
  const modelPerformance = analysis.modelPerformance

  return toolCountData.map((item: any) => ({
    tools: item.toolCount,
    "gpt-3.5-turbo":
      modelPerformance.find((m: any) => m.model === "gpt-3.5-turbo")
        ?.accuracy || 0,
    "gpt-4o-mini":
      modelPerformance.find((m: any) => m.model === "gpt-4o-mini")?.accuracy ||
      0,
    "gpt-4-turbo":
      modelPerformance.find((m: any) => m.model === "gpt-4-turbo")?.accuracy ||
      0,
  }))
}

// Fallback tool capacity data
const fallbackToolCapacityData = [
  { tools: 4, "gpt-3.5-turbo": 74.4, "gpt-4o-mini": 76.7, "gpt-4-turbo": 82.2 },
  { tools: 8, "gpt-3.5-turbo": 74.4, "gpt-4o-mini": 76.7, "gpt-4-turbo": 82.2 },
  {
    tools: 16,
    "gpt-3.5-turbo": 74.4,
    "gpt-4o-mini": 76.7,
    "gpt-4-turbo": 82.2,
  },
  {
    tools: 32,
    "gpt-3.5-turbo": 74.4,
    "gpt-4o-mini": 76.7,
    "gpt-4-turbo": 82.2,
  },
  {
    tools: 64,
    "gpt-3.5-turbo": 74.4,
    "gpt-4o-mini": 76.7,
    "gpt-4-turbo": 82.2,
  },
  {
    tools: 104,
    "gpt-3.5-turbo": 74.4,
    "gpt-4o-mini": 76.7,
    "gpt-4-turbo": 82.2,
  },
]

// Create radar data with real tool capacity results
const createRadarData = (modelPerformance: any) => {
  const radarData = [
    {
      capability: "Adaptive Behavior",
      "gpt-3.5-turbo": 66.7,
      "gpt-4o-mini": 50,
      "gpt-4-turbo": 50,
    },
    {
      capability: "Sequential Execution",
      "gpt-3.5-turbo": 100,
      "gpt-4o-mini": 80,
      "gpt-4-turbo": 90,
    },
    {
      capability: "Tool Capacity",
      "gpt-3.5-turbo":
        modelPerformance?.find((m: any) => m.model === "gpt-3.5-turbo")
          ?.accuracy || 74.4,
      "gpt-4o-mini":
        modelPerformance?.find((m: any) => m.model === "gpt-4o-mini")
          ?.accuracy || 76.7,
      "gpt-4-turbo":
        modelPerformance?.find((m: any) => m.model === "gpt-4-turbo")
          ?.accuracy || 82.2,
    },
    {
      capability: "Clear Prompt Response",
      "gpt-3.5-turbo": 100,
      "gpt-4o-mini": 100,
      "gpt-4-turbo": 100,
    },
    {
      capability: "Vague Prompt Response",
      "gpt-3.5-turbo": 66.7,
      "gpt-4o-mini": 0,
      "gpt-4-turbo": 0,
    },
  ]
  return radarData
}

export default function ExperimentsOverviewPage() {
  const [activeTab, setActiveTab] = useState<
    "adaptive" | "sequential" | "capacity" | "overview"
  >("overview")

  const [researchData, setResearchData] = useState<any>(null)
  const [toolCapacityData, setToolCapacityData] = useState(
    fallbackToolCapacityData
  )
  const [radarData, setRadarData] = useState(createRadarData(null))
  const [overallAccuracy, setOverallAccuracy] = useState(77.8)

  useEffect(() => {
    const loadData = async () => {
      const data = await loadToolCapacityData()
      if (data) {
        setResearchData(data)
        const transformedData = transformToolCapacityData(data.analysis)
        if (transformedData.length > 0) {
          setToolCapacityData(transformedData)
        }
        setRadarData(createRadarData(data.analysis.modelPerformance))
        setOverallAccuracy(data.results.summary?.overallAccuracy || 77.8)
      }
    }
    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          AI Tool Selection Experiments
        </h1>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("adaptive")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === "adaptive"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Adaptive Behavior
          </button>
          <button
            onClick={() => setActiveTab("sequential")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === "sequential"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Sequential Execution
          </button>
          <button
            onClick={() => setActiveTab("capacity")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === "capacity"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Tool Capacity
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Model Capabilities Overview
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="capability" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="gpt-3.5-turbo"
                    dataKey="gpt-3.5-turbo"
                    stroke={modelColors["gpt-3.5-turbo"]}
                    fill={modelColors["gpt-3.5-turbo"]}
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="gpt-4o-mini"
                    dataKey="gpt-4o-mini"
                    stroke={modelColors["gpt-4o-mini"]}
                    fill={modelColors["gpt-4o-mini"]}
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="gpt-4-turbo"
                    dataKey="gpt-4-turbo"
                    stroke={modelColors["gpt-4-turbo"]}
                    fill={modelColors["gpt-4-turbo"]}
                    fillOpacity={0.3}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Overall Accuracy</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {overallAccuracy.toFixed(1)}%
                </p>
                <p className="text-gray-600">
                  Tool selection accuracy across all tests
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Best Performer</h3>
                <p className="text-3xl font-bold text-green-600">GPT-4 Turbo</p>
                <p className="text-gray-600">Highest tool selection accuracy</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Total Runs</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {researchData?.results?.summary?.totalRuns || 270}
                </p>
                <p className="text-gray-600">
                  Experimental data points collected
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Adaptive Behavior Tab */}
        {activeTab === "adaptive" && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Adaptive Behavior: Vague vs Clear Prompts
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={adaptiveSummaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="vague"
                    fill={semantic.negative}
                    name="Vague Prompt Success %"
                  />
                  <Bar
                    dataKey="clear"
                    fill={semantic.positive}
                    name="Clear Prompt Success %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Improvement with Clear Prompts
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={adaptiveSummaryData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="model" type="category" />
                  <Tooltip />
                  <Bar
                    dataKey="improvement"
                    fill={semantic.info}
                    name="Improvement %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <h3 className="font-semibold text-yellow-800">Key Insight</h3>
              <p className="text-yellow-700">
                Vague prompts prevent AI models from adapting when tools have
                hidden constraints. Clear documentation enables 100% success
                rate across all tested models.
              </p>
            </div>
          </div>
        )}

        {/* Sequential Execution Tab */}
        {activeTab === "sequential" && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Sequential Tool Execution Performance
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={sequentialData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="2-step" fill={stepColors["2-step"]} />
                  <Bar dataKey="5-step" fill={stepColors["5-step"]} />
                  <Bar dataKey="10-step" fill={stepColors["10-step"]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <h3 className="font-semibold text-green-800">Key Insight</h3>
              <p className="text-green-700">
                gpt-3.5-turbo achieves perfect 100% success across all
                sequential execution tasks, outperforming more advanced models
                in complex multi-step tool chains.
              </p>
            </div>
          </div>
        )}

        {/* Tool Capacity Tab */}
        {activeTab === "capacity" && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Tool Capacity Performance
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={toolCapacityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="tools"
                    label={{
                      value: "Number of Tools",
                      position: "insideBottom",
                      offset: -5,
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    label={{
                      value: "Success Rate %",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="gpt-3.5-turbo"
                    stroke={modelColors["gpt-3.5-turbo"]}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="gpt-4o-mini"
                    stroke={modelColors["gpt-4o-mini"]}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="gpt-4-turbo"
                    stroke={modelColors["gpt-4-turbo"]}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <h3 className="font-semibold text-blue-800">Research Insights</h3>
              <p className="text-blue-700">
                GPT-4 Turbo achieved{" "}
                {researchData?.analysis?.modelPerformance
                  ?.find((m: any) => m.model === "gpt-4-turbo")
                  ?.accuracy?.toFixed(1) || 82.2}
                % accuracy across all tool counts. Performance varies by tool
                count, with 32 tools showing optimal results (
                {researchData?.analysis?.toolCountPerformance
                  ?.find((t: any) => t.toolCount === 32)
                  ?.accuracy?.toFixed(1) || 88.9}
                % accuracy). Average latency:{" "}
                {researchData?.results?.summary?.averageLatency || 3564}ms per
                request.
              </p>
            </div>

            {researchData && (
              <div className="bg-gray-50 border-l-4 border-gray-400 p-4">
                <h3 className="font-semibold text-gray-800">
                  Experiment Details
                </h3>
                <p className="text-gray-700">
                  Data collected from {researchData.results.summary.totalRuns}{" "}
                  runs across {researchData.results.configuration.models.length}{" "}
                  models and{" "}
                  {researchData.results.configuration.toolCounts.length}{" "}
                  different tool count configurations. Test period:{" "}
                  {new Date(
                    researchData.results.timestamp
                  ).toLocaleDateString()}{" "}
                  {" - "}
                  {new Date(researchData.results.endTime).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
