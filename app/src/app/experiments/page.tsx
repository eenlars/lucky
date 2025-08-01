"use client"

import { useState } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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

// Tool capacity data
const toolCapacityData = [
  { tools: 9, "gpt-3.5-turbo": 40, "gpt-4o-mini": 60, "gpt-4-turbo": 60 },
  { tools: 19, "gpt-3.5-turbo": 40, "gpt-4o-mini": 80, "gpt-4-turbo": 80 },
  { tools: 29, "gpt-3.5-turbo": 40, "gpt-4o-mini": 80, "gpt-4-turbo": 60 },
  { tools: 54, "gpt-3.5-turbo": 60, "gpt-4o-mini": 80, "gpt-4-turbo": 80 },
  { tools: 79, "gpt-3.5-turbo": 60, "gpt-4o-mini": 80, "gpt-4-turbo": 80 },
  { tools: 104, "gpt-3.5-turbo": 60, "gpt-4o-mini": 80, "gpt-4-turbo": 80 },
]

// Radar chart data for model capabilities
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
    "gpt-3.5-turbo": 50,
    "gpt-4o-mini": 77,
    "gpt-4-turbo": 73,
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

export default function ExperimentsPage() {
  const [activeTab, setActiveTab] = useState<
    "adaptive" | "sequential" | "capacity" | "overview"
  >("overview")

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
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="gpt-4o-mini"
                    dataKey="gpt-4o-mini"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="gpt-4-turbo"
                    dataKey="gpt-4-turbo"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Key Finding 1</h3>
                <p className="text-3xl font-bold text-blue-600">77.8%</p>
                <p className="text-gray-600">Improvement with clear prompts</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Key Finding 2</h3>
                <p className="text-3xl font-bold text-green-600">100%</p>
                <p className="text-gray-600">Success rate with clear prompts</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Key Finding 3</h3>
                <p className="text-3xl font-bold text-purple-600">gpt-3.5</p>
                <p className="text-gray-600">Most adaptive model</p>
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
                    fill="#ef4444"
                    name="Vague Prompt Success %"
                  />
                  <Bar
                    dataKey="clear"
                    fill="#10b981"
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
                    fill="#6366f1"
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
                  <Bar dataKey="2-step" fill="#8b5cf6" />
                  <Bar dataKey="5-step" fill="#06b6d4" />
                  <Bar dataKey="10-step" fill="#f59e0b" />
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
                    stroke="#8b5cf6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="gpt-4o-mini"
                    stroke="#06b6d4"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="gpt-4-turbo"
                    stroke="#f59e0b"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <h3 className="font-semibold text-blue-800">Key Insight</h3>
              <p className="text-blue-700">
                No significant performance degradation observed even with 104+
                tools. Tool quantity is not the bottleneck - tool selection
                strategy matters more.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
