"use client"

import { CodeInput } from "@/components/ui/code"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/features/react-flow-visualization/components/ui/dialog"
import { Maximize2 } from "lucide-react"
import { useState } from "react"

interface InspectableCodeProps {
  content: string
  title: string
}

export const InspectableCode = ({ content, title }: InspectableCodeProps) => {
  const [open, setOpen] = useState(false)

  if (!content) return null

  return (
    <>
      <div
        className="relative rounded-md border bg-muted/50 p-2 overflow-hidden group cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <div className="absolute right-2 top-2 p-1 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="h-3 w-3" />
        </div>
        <CodeInput block wrap className="text-xs leading-[18px] whitespace-pre-wrap break-words">
          {content}
        </CodeInput>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-fit min-w-[50vw] max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto overflow-y-auto h-full">
            <CodeInput
              block
              wrap={title.includes("Prompt")}
              className={`text-sm leading-[20px] ${
                title.includes("Prompt") ? "whitespace-pre-wrap break-words" : "whitespace-pre font-mono bg-blue-50"
              } w-full`}
            >
              {content}
            </CodeInput>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
