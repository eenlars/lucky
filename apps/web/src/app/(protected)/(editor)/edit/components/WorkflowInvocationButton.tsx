"use client"

import { Button } from "@/components/ui/button"
import { generateCurlCommand } from "@/lib/generate-curl-command"
import { Check, Code, Copy, X } from "lucide-react"
import { useState } from "react"

type WorkflowInvocationButtonProps = {
  workflowVersionId?: string
}

export default function WorkflowInvocationButton({ workflowVersionId }: WorkflowInvocationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const curlCommand = workflowVersionId ? generateCurlCommand(workflowVersionId) : null

  const handleCopy = async () => {
    if (!curlCommand) return
    try {
      await navigator.clipboard.writeText(curlCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="group relative"
        data-testid="workflow-invocation-button"
      >
        <Code className="w-4 h-4 mr-1.5" />
        <span className="opacity-80 group-hover:opacity-100">Invoke</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-3xl w-full mx-4 shadow-2xl transform transition-all">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Code className="w-5 h-5 text-blue-600" />
                  Invoke Workflow via API
                </h3>
                <Button onClick={() => setIsOpen(false)} variant="ghost" size="sm" className="h-auto p-1">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              {!workflowVersionId ? (
                <p className="text-sm text-amber-600 mt-2 font-medium">
                  Save your workflow first to get API invocation details
                </p>
              ) : (
                <p className="text-sm text-gray-600 mt-2">
                  Use this curl command to invoke your workflow via JSON-RPC 2.0
                </p>
              )}
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {!workflowVersionId ? (
                <div className="text-center py-8">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <svg
                      className="w-12 h-12 text-amber-500 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Workflow Not Saved</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      You need to save your workflow before you can get the API invocation details. Once saved,
                      you&apos;ll get a workflow version ID that you can use to invoke it via API.
                    </p>
                    <Button onClick={() => setIsOpen(false)} variant="default">
                      Got it
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Workflow ID Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-blue-600 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="text-sm">
                        <span className="font-medium text-blue-900">Workflow ID: </span>
                        <code className="text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">
                          {workflowVersionId}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Curl Command */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">cURL Command</label>
                      <Button
                        onClick={handleCopy}
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs"
                        data-testid="copy-curl-button"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed border border-gray-700">
                      {curlCommand}
                    </pre>
                  </div>

                  {/* Instructions */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Setup Instructions</h4>
                    <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                      <li>
                        Replace <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">YOUR_API_KEY</code> with
                        your actual API key
                      </li>
                      <li>
                        Replace{" "}
                        <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">&quot;Your input here&quot;</code>{" "}
                        with your workflow input
                      </li>
                      <li>
                        Update the <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">goal</code> parameter to
                        describe your workflow objective
                      </li>
                      <li>Run the command in your terminal or integrate it into your application</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
              <div className="flex items-center justify-between">
                <a
                  href="https://www.jsonrpc.org/specification"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Learn more about JSON-RPC 2.0 →
                </a>
                <Button onClick={() => setIsOpen(false)} variant="default">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
