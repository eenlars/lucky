"use client"

import { CodeInput } from "@/components/ui/code"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/features/react-flow-visualization/components/ui/dialog"
import { extractTextFromPayload, isDelegationPayload, isSequentialPayload } from "@lucky/shared"
import type { Json } from "@lucky/shared/client"
import { Maximize2, MessageSquare, Users } from "lucide-react"
import { useState } from "react"

interface PayloadRenderProps {
  payload: unknown
  msgId: string
  inspectable?: boolean
}

const tryParseJson = (str: any) => {
  if (typeof str !== "string") return str
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}

export const PayloadRender = ({ payload, msgId, inspectable = false }: PayloadRenderProps) => {
  const [open, setOpen] = useState(false)

  // handle aggregated payload (combines multiple messages from awaited nodes)
  if (payload && typeof payload === "object" && (payload as any).kind === "aggregated" && (payload as any).messages) {
    const aggregatedPayload = payload as {
      kind: "aggregated"
      messages: Array<{ payload: any; fromNodeId: string }>
    }

    const content = (
      <div className="flex flex-col gap-3" key={msgId}>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          <div className="text-sm font-medium text-blue-600">
            aggregated ({aggregatedPayload.messages.length} nodes)
          </div>
        </div>
        <div className="space-y-2">
          {aggregatedPayload.messages.map((message, index) => (
            <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">from: {message.fromNodeId}</span>
              </div>
              <PayloadRender payload={message.payload} msgId={`${msgId}-${index}`} inspectable={false} />
            </div>
          ))}
        </div>
      </div>
    )

    if (inspectable) {
      return (
        <>
          <div className="relative group cursor-pointer" onClick={() => setOpen(true)}>
            {content}
            <div className="absolute right-2 top-2 p-1 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="h-3 w-3" />
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Aggregated Messages</DialogTitle>
              </DialogHeader>
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(80vh-8rem)]">{content}</div>
            </DialogContent>
          </Dialog>
        </>
      )
    }

    return content
  }

  // handle delegation payload
  if (isDelegationPayload(payload)) {
    const parsedData: Json | string = tryParseJson(extractTextFromPayload(payload))

    const content = (
      <div className="flex flex-col gap-2" key={msgId}>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <div className="text-sm font-medium text-blue-600">{payload.kind}</div>
        </div>
        {typeof parsedData === "string" ? (
          <div className="text-sm break-all">{parsedData}</div>
        ) : (
          <CodeInput block className="text-xs leading-[18px] bg-blue-50">
            {JSON.stringify(parsedData, null, 2)}
          </CodeInput>
        )}
        {/* context field removed in new payload schema */}
      </div>
    )

    if (inspectable) {
      return (
        <>
          <div className="relative group cursor-pointer" onClick={() => setOpen(true)}>
            {content}
            <div className="absolute right-2 top-2 p-1 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="h-3 w-3" />
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Payload: {payload.kind}</DialogTitle>
              </DialogHeader>
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(80vh-8rem)]">{content}</div>
            </DialogContent>
          </Dialog>
        </>
      )
    }

    return content
  }

  // handle any payload
  if (isSequentialPayload(payload)) {
    const parsedData: Json | string = tryParseJson(extractTextFromPayload(payload))

    const content = (
      <div className="flex flex-col gap-2" key={msgId}>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <div className="text-sm font-medium text-gray-600">{payload.kind}</div>
        </div>
        {typeof parsedData === "string" ? (
          <div className="text-sm break-all">{parsedData}</div>
        ) : (
          <CodeInput block className="text-xs leading-[18px] bg-gray-50">
            {JSON.stringify(parsedData, null, 2)}
          </CodeInput>
        )}
        {/* context field removed in new payload schema */}
      </div>
    )

    if (inspectable) {
      return (
        <>
          <div className="relative group cursor-pointer" onClick={() => setOpen(true)}>
            {content}
            <div className="absolute right-2 top-2 p-1 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="h-3 w-3" />
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Payload: {payload.kind}</DialogTitle>
              </DialogHeader>
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(80vh-8rem)]">{content}</div>
            </DialogContent>
          </Dialog>
        </>
      )
    }

    return content
  }

  // fallback to json for unknown payload types
  const jsonContent = JSON.stringify(payload, null, 2)

  if (inspectable) {
    return (
      <>
        <div
          className="relative mt-1 block break-words rounded bg-blue-50 p-2 text-xs group cursor-pointer overflow-hidden"
          onClick={() => setOpen(true)}
        >
          <div className="absolute right-2 top-2 p-1 rounded-md bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="h-3 w-3" />
          </div>
          <pre>{jsonContent}</pre>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-fit min-w-[50vw] max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>JSON Payload</DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(85vh-8rem)]">
              <CodeInput block wrap={false} className="text-sm leading-[20px] whitespace-pre font-mono w-full">
                {jsonContent}
              </CodeInput>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return <pre className="mt-1 block break-words rounded bg-gray-100 p-2 text-xs">{jsonContent}</pre>
}
