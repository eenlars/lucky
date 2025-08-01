"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

interface WorkflowVersion {
  wf_version_id: string
  commit_message: string
  created_at: string
  operation: string
}

export default function RunnerPage() {
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowVersion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWorkflows() {
      try {
        const response = await fetch("/api/workflow/latest?limit=10")
        if (response.ok) {
          const data = await response.json()
          setRecentWorkflows(data)
        }
      } catch (error) {
        console.error("Failed to load workflows:", error)
      } finally {
        setLoading(false)
      }
    }

    loadWorkflows()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div>Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Workflow Runner
          </h1>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Select a workflow version to run and monitor execution logs.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Workflow Versions
            </h2>

            {recentWorkflows && recentWorkflows.length > 0 ? (
              <div className="grid gap-4">
                {recentWorkflows.map((workflow) => (
                  <Link
                    key={workflow.wf_version_id}
                    href={`/runner/${workflow.wf_version_id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {workflow.commit_message || "Untitled Workflow"}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          ID: {workflow.wf_version_id}
                        </p>
                        <p className="text-sm text-gray-600">
                          Created:{" "}
                          {new Date(workflow.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {workflow.operation}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No workflow versions found.</p>
                <Link
                  href="/edit"
                  className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  Create a new workflow →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
