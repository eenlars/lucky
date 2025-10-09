"use client"

import { useWorkflowQuery } from "@/hooks/queries/useWorkflowQuery"
import { useWorkflowVersionQuery } from "@/hooks/queries/useWorkflowVersionQuery"
import { AppStoreProvider } from "@/react-flow-visualization/store/store"
import { notFound, useRouter } from "next/navigation"
import { use, useEffect } from "react"
import EditModeSelector from "../components/EditModeSelector"

interface PageProps {
  params: Promise<{
    wf_version_id: string
  }>
}

export default function WorkflowVersionEditor({ params }: PageProps) {
  const { wf_version_id } = use(params)
  const router = useRouter()

  // Try to fetch as workflow version first
  const { data: workflowVersion, isLoading, error } = useWorkflowVersionQuery(wf_version_id)

  // If version fetch fails, try to fetch as workflow and get latest version
  const shouldFetchWorkflow = error !== null
  const {
    data: workflowData,
    isLoading: isLoadingWorkflow,
    error: workflowError,
  } = useWorkflowQuery(shouldFetchWorkflow ? wf_version_id : undefined)

  // Handle redirect to latest version if user provided workflow ID instead of version ID
  useEffect(() => {
    if (workflowData && !isLoadingWorkflow) {
      const latestVersion = workflowData.versions?.[0]
      if (latestVersion?.wf_version_id) {
        router.replace(`/edit/${latestVersion.wf_version_id}`)
      }
    }
  }, [workflowData, isLoadingWorkflow, router])

  // Show loading state
  if (isLoading || (shouldFetchWorkflow && isLoadingWorkflow)) {
    return <div>Loading...</div>
  }

  // Show error state
  if (workflowError || (error && !shouldFetchWorkflow)) {
    notFound()
  }

  // Show redirecting state only if we have a redirect target
  if (shouldFetchWorkflow && workflowData && workflowData.versions?.[0]?.wf_version_id) {
    return <div>Loading...</div>
  }

  // No data available
  if (!workflowVersion) {
    notFound()
  }

  return (
    <AppStoreProvider>
      <EditModeSelector workflowVersion={workflowVersion} />
    </AppStoreProvider>
  )
}
