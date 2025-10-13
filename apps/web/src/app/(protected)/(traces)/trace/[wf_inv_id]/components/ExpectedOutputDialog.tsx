"use client"

import { Button } from "@/features/react-flow-visualization/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/features/react-flow-visualization/components/ui/dialog"
import type { Json } from "@lucky/shared/client"
import { Copy, Expand, FileJson } from "lucide-react"
import { useState } from "react"

interface ExpectedOutputDialogProps {
  expectedOutputType: Json
}

export function ExpectedOutputDialog({ expectedOutputType }: ExpectedOutputDialogProps) {
  const [isCopied, setIsCopied] = useState(false)

  const jsonString =
    typeof expectedOutputType === "string" ? expectedOutputType : JSON.stringify(expectedOutputType, null, 2)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy to clipboard", err)
    }
  }

  // Create a preview - first 5 lines for better context
  const lines = jsonString.split("\n")
  const preview = lines.length > 5 ? `${lines.slice(0, 5).join("\n")}\n...` : jsonString

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-700 flex items-center gap-2">
          <FileJson size={16} />
          Expected Output Type
        </h4>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Expand size={14} />
              View Full Schema
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileJson size={20} />
                  Expected Output Schema
                </span>
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                  <Copy size={14} />
                  {isCopied ? "Copied!" : "Copy"}
                </Button>
              </DialogTitle>
              <DialogDescription>
                The schema that defines the expected structure and types for the workflow output
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 overflow-auto max-h-[60vh]">
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                <code className="text-gray-800 whitespace-pre">{jsonString}</code>
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview section */}
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap">{preview}</pre>
      </div>
    </div>
  )
}
