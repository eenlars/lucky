"use client"

import { useState } from "react"
import { processAdaptiveData } from "./AdaptiveDataProcessor"
import SuccessRateMatrix from "./SuccessRateMatrix"
import BehaviorMetrics from "./BehaviorMetrics"
import ToolSequenceFlow from "./ToolSequenceFlow"

const tabs = [
  {
    id: "overview",
    name: "Success Rate Overview",
    description: "Key findings and success rates",
  },
  {
    id: "behavior",
    name: "Behavioral Analysis",
    description: "Retry patterns and efficiency metrics",
  },
  {
    id: "sequences",
    name: "Tool Sequences",
    description: "Adaptation patterns and strategies",
  },
]

export default function AdaptiveExperimentVisualization() {
  const [activeTab, setActiveTab] = useState("overview")
  const data = processAdaptiveData()

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-2 border-black bg-white">
          <h2 className="text-2xl font-bold mb-2 text-black">Adaptive AI Behavior Experiment</h2>
          <p className="text-gray-700">
            Analysis of how different AI models handle tool failures and adapt their strategies
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="border border-black rounded p-2 text-center bg-white">
              <div className="font-semibold text-lg text-black">{data.models.length}</div>
              <div className="text-gray-700">Models Tested</div>
            </div>
            <div className="border border-black rounded p-2 text-center bg-white">
              <div className="font-semibold text-lg text-black">{data.results.length}</div>
              <div className="text-gray-700">Total Runs</div>
            </div>
            <div className="border border-black rounded p-2 text-center bg-white">
              <div className="font-semibold text-lg text-black">{data.scenarios.length}</div>
              <div className="text-gray-700">Scenarios</div>
            </div>
            <div className="border border-black rounded p-2 text-center bg-white">
              <div className="font-semibold text-lg text-black">2</div>
              <div className="text-gray-700">Conditions</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-black text-black bg-gray-100"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-black"
                }`}
              >
                <div className="text-center">
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{tab.description}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <SuccessRateMatrix data={data} />

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Best Adaptive Model</h4>
                <div className="text-3xl font-bold text-black mb-1">GPT-3.5-turbo</div>
                <div className="text-sm text-gray-600">Only model showing OLD method adaptation (50% success)</div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Our Solution Success</h4>
                <div className="text-3xl font-bold text-black mb-1">100%</div>
                <div className="text-sm text-gray-600">All models achieved perfect success with our solution</div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Average Improvement</h4>
                <div className="text-3xl font-bold text-black mb-1">+80%</div>
                <div className="text-sm text-gray-600">Success rate improvement with our solution</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "behavior" && <BehaviorMetrics data={data} />}

        {activeTab === "sequences" && <ToolSequenceFlow data={data} />}
      </div>

      {/* Experimental Details Footer */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Experiment Design</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">Tool Constraint</h4>
            <p>
              The fetch_objects tool fails for requests &gt;3 items, requiring models to adapt by chunking large
              requests into smaller ones.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Success Criteria</h4>
            <p>
              Successful adaptation involves breaking requests into &le;3 item chunks, making multiple calls, and
              combining results to reach target counts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
