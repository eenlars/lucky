"use client"

import { AppStoreProvider } from "@/react-flow-visualization/store/store"
import { notFound, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import EditModeSelector from "../components/EditModeSelector"

interface PageProps {
  params: Promise<{
    wf_version_id: string
  }>
}

export default function WorkflowVersionEditor({ params }: PageProps) {
  const [workflowVersion, setWorkflowVersion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadWorkflow() {
      try {
        const { wf_version_id } = await params
        const response = await fetch(`/api/workflow/version/${wf_version_id}`)

        if (!response.ok) {
          // If version not found, try to fetch as workflow ID and get latest version
          const workflowResponse = await fetch(`/api/workflow/${wf_version_id}`)

          if (workflowResponse.ok) {
            const workflowData = await workflowResponse.json()
            const latestVersion = workflowData.versions?.[0]

            if (latestVersion?.wf_version_id) {
              // Redirect to the latest version
              setRedirecting(true)
              router.replace(`/edit/${latestVersion.wf_version_id}`)
              return
            }
          }

          setError(true)
          setLoading(false)
          return
        }

        const data = await response.json()
        setWorkflowVersion(data)
        setLoading(false)
      } catch (err) {
        console.error("Failed to load workflow version:", err)
        setError(true)
        setLoading(false)
      }
    }

    loadWorkflow()
  }, [params, router])

  if (loading || redirecting) return <div>Loading...</div>
  if (error) notFound()
  if (!workflowVersion) notFound()

  return (
    <AppStoreProvider>
      <EditModeSelector workflowVersion={workflowVersion} />
    </AppStoreProvider>
  )
}
