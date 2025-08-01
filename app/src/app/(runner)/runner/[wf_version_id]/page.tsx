"use client"

import { useEffect, useState } from "react"
import { notFound } from "next/navigation"
import WorkflowRunner from "./components/WorkflowRunner"

interface PageProps {
  params: Promise<{
    wf_version_id: string
  }>
}

export default function WorkflowRunnerPage({ params }: PageProps) {
  const [workflowVersion, setWorkflowVersion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadWorkflow() {
      try {
        const { wf_version_id } = await params
        const response = await fetch(`/api/workflow/version/${wf_version_id}`)

        if (!response.ok) {
          setError(true)
          return
        }

        const data = await response.json()
        setWorkflowVersion(data)
      } catch (err) {
        console.error("Failed to load workflow version:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadWorkflow()
  }, [params])

  if (loading) return <div>Loading...</div>
  if (error) notFound()
  if (!workflowVersion) notFound()

  return <WorkflowRunner workflowVersion={workflowVersion} />
}
