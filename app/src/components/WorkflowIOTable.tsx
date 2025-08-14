"use client"

import type { CaseRow } from "@/stores/run-config-store"
import type { InvokeWorkflowResult } from "@core/workflow/runner/types"
import WorkflowIOTableRow from "./WorkflowIOTableRow"

export type WorkflowIO = CaseRow

type Result = InvokeWorkflowResult | { error: string }

type Props = {
  ios: CaseRow[]
  resultsById: Record<string, Result>
  busyIds: Set<string>
  onUpdate: (ioId: string, patch: Partial<CaseRow>) => void | Promise<void>
  onDelete: (ioId: string) => void | Promise<void>
  onRun: (io: CaseRow) => Promise<void>
  onCancel: (ioId: string) => void
}

export default function WorkflowIOTable({
  ios,
  resultsById,
  busyIds,
  onUpdate,
  onDelete,
  onRun,
  onCancel,
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
            busy={busyIds.has(io.id)}
            result={resultsById[io.id]}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onRun={onRun}
            onCancel={onCancel}
          />
        ))}
      </tbody>
    </table>
  )
}
