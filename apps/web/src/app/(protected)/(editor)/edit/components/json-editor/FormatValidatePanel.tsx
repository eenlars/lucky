"use client"

import { Button } from "@/components/ui/button"
import { WORKFLOW_TEMPLATES } from "../workflow-templates/templates"

type VerificationResult = {
  isValid: boolean
  errors: string[]
}

type FormatValidatePanelProps = {
  workflowJSON: string
  jsonParseError: string | null
  updateWorkflowJSON: (val: string) => void
  setIsDirty: (val: boolean) => void
  isVerifying: boolean
  onVerify: () => void
  verificationResult: VerificationResult | null
}

export default function FormatValidatePanel({
  workflowJSON,
  jsonParseError,
  updateWorkflowJSON,
  setIsDirty,
  isVerifying,
  onVerify,
  verificationResult,
}: FormatValidatePanelProps) {
  return (
    <div className="flex-1 bg-white overflow-y-auto">
      <div className="px-6 py-4">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Format & Validate
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Button
              onClick={() => {
                try {
                  const parsed = JSON.parse(workflowJSON)
                  const formatted = JSON.stringify(parsed, null, 2)
                  updateWorkflowJSON(formatted)
                } catch {
                  // Invalid JSON, do nothing
                }
              }}
              variant="outline"
              className="w-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              Format JSON
            </Button>

            <Button onClick={onVerify} disabled={isVerifying || !!jsonParseError} variant="outline" className="w-full">
              {isVerifying ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Validating...
                </>
              ) : jsonParseError ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Fix JSON First
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Validate Workflow
                </>
              )}
            </Button>
          </div>

          <div
            className={`p-3 rounded-lg border ${jsonParseError ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
          >
            <div className="flex items-center gap-2">
              {jsonParseError ? (
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className={`text-sm font-medium ${jsonParseError ? "text-red-800" : "text-green-800"}`}>
                {jsonParseError ? "Invalid JSON" : "Valid JSON"}
              </span>
            </div>
            {jsonParseError && <p className="text-xs text-red-600 mt-1">{jsonParseError}</p>}
          </div>

          {verificationResult && (
            <div
              className={`p-3 rounded-lg border-2 border-dashed ${verificationResult.isValid ? "bg-emerald-50 border-emerald-300" : "bg-orange-50 border-orange-300"}`}
            >
              <div className="flex items-center gap-2">
                {verificationResult.isValid ? (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                <span
                  className={`text-sm font-medium ${verificationResult.isValid ? "text-emerald-800" : "text-orange-800"}`}
                >
                  {verificationResult.isValid ? "Workflow Ready" : `${verificationResult.errors.length} Issues Found`}
                </span>
                <span className="text-xs text-gray-500 ml-auto">Status</span>
              </div>
              {!verificationResult.isValid && (
                <ul className="mt-2 space-y-1">
                  {verificationResult.errors.slice(0, 3).map((error, index) => (
                    <li key={index} className="text-xs text-orange-700">
                      • {error}
                    </li>
                  ))}
                  {verificationResult.errors.length > 3 && (
                    <li className="text-xs text-orange-600">+ {verificationResult.errors.length - 3} more issues</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Start Templates</h4>
            <div className="space-y-2">
              {WORKFLOW_TEMPLATES.map(template => (
                <Button
                  key={template.id}
                  onClick={() => {
                    updateWorkflowJSON(JSON.stringify(template.workflow, null, 2))
                    setIsDirty(true)
                  }}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2.5"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
