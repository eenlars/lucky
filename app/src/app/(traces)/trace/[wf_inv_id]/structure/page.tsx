"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { use, useEffect, useState } from "react"

import { fullWorkflow } from "@/trace-visualization/db/Workflow/fullWorkflow"
import { isWorkflowConfig } from "@core/workflow/schema/workflow.types"
import { JSONN } from "@shared/utils/files/json/jsonParse"
import { StructureMiniMap } from "./StructureMiniMap"

export default function WorkflowStructurePage({
  params,
}: {
  params: Promise<{ wf_inv_id: string }>
}) {
  const { wf_inv_id } = use(params)
  const [workflowData, setWorkflowData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await fullWorkflow(wf_inv_id)
        setWorkflowData(data)
      } catch (err) {
        console.error("Error fetching workflow structure:", err)
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load workflow structure."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [wf_inv_id])

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl">Loading workflow structure…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Link
          href={`/trace/${wf_inv_id}`}
          className="inline-flex items-center gap-2 text-blue-500 hover:underline mb-4"
        >
          <ArrowLeft size={16} />
          Back to trace
        </Link>
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Link
        href={`/trace/${wf_inv_id}`}
        className="inline-flex items-center gap-2 text-blue-500 hover:underline"
      >
        <ArrowLeft size={16} />
        Back to trace
      </Link>

      <h1 className="text-2xl font-bold">Workflow Structure: {wf_inv_id}</h1>

      {isWorkflowConfig(workflowData?.workflowVersion?.dsl) && (
        <div className="flex justify-center mb-6">
          <StructureMiniMap dsl={workflowData?.workflowVersion?.dsl} />
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Workflow DSL</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-[70vh] whitespace-pre-wrap">
          {JSONN.show(workflowData?.workflowVersion?.dsl, 2, 10)}
        </pre>
      </div>
    </div>
  )
}
