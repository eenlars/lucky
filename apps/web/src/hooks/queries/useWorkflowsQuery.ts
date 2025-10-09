import { queryKeys } from "@/lib/query-keys"
import { listWorkflows } from "@/lib/workflows"
import { useAuth } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"

/**
 * Hook to fetch all workflows for the current user
 * Automatically refetches when user signs in
 */
export function useWorkflowsQuery() {
  const { isLoaded, isSignedIn } = useAuth()

  return useQuery({
    queryKey: queryKeys.workflows.lists(),
    queryFn: listWorkflows,
    enabled: isLoaded && isSignedIn,
    staleTime: 60_000, // Workflows don't change frequently, keep fresh for 1 min
  })
}
