/**
 * Generate a curl command to invoke a workflow via JSON-RPC 2.0
 */
export function generateCurlCommand(workflowVersionId: string, baseUrl?: string): string {
  const apiUrl = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "https://your-api.com"
  const endpoint = `${apiUrl}/api/v1/invoke`

  const curlCommand = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "jsonrpc": "2.0",
    "id": "req_001",
    "method": "workflow.invoke",
    "params": {
      "workflow_id": "${workflowVersionId}",
      "input": "Your input here",
      "options": {
        "goal": "Describe your workflow goal",
        "trace": true
      }
    }
  }'`

  return curlCommand
}
