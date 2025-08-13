"use client"

import type { InvokeWorkflowResult } from "@core/workflow/runner/types";
import WorkflowIOTableRow from "./WorkflowIOTableRow";

export type WorkflowIO = { id: string; input: string; expected: string }

type Props = {
  ios: WorkflowIO[]
  resultsById?: Record<string, InvokeWorkflowResult | { error: string }>
  busyIds?: Set<string>
  onUpdate: (ioId: string, patch: Partial<WorkflowIO>) => Promise<void>
  onDelete: (ioId: string) => Promise<void>
  onRun: (io: WorkflowIO) => Promise<void>
  onCancel: (ioId: string) => void
}

export default function WorkflowIOTable({
  ios,
  onRun,
}: Props) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase text-gray-500 border-b">
        <tr>
          <th className="text-left py-2 px-3 w-10">#</th>
          <th className="text-left py-2 px-3">Input</th>
          <th className="text-left py-2 px-3">Expected</th>
          <th className="text-left py-2 px-3">Output</th>
          <th className="text-left py-2 px-3 w-20">Score</th>
          <th className="py-2 px-3 w-28"></th>
        </tr>
      </thead>
      <tbody>
        {ios.map((io, i) => (
          <WorkflowIOTableRow 
            key={io.id} 
            io={io} 
            index={i} 
            onRun={onRun}
          />
        ))}
      </tbody>
    </table>
  )
}