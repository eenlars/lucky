"use client"

import type { CaseRow } from "@/stores/run-config-store"
import WorkflowIOTableRow from "./WorkflowIOTableRow"

export type WorkflowIO = CaseRow

type Props = {
  ios: CaseRow[]
  onRun?: (io: CaseRow) => Promise<void>
}

export default function WorkflowIOTable({ ios, onRun }: Props) {
  return (
    <table className="w-full text-sm" data-testid="workflow-io-table">
      <thead className="text-xs uppercase text-gray-500 border-b">
        <tr>
          <th className="text-left py-2 px-3 w-10">#</th>
          <th className="text-left py-2 px-3">Input</th>
          <th className="text-left py-2 px-3">Expected Output</th>
          <th className="text-left py-2 px-3">Output</th>
          <th className="text-left py-2 px-3 w-20">Score</th>
          <th className="py-2 px-3 w-28"></th>
        </tr>
      </thead>
      <tbody>
        {ios.map((io, i) => (
          <WorkflowIOTableRow key={io.id} io={io} index={i} onRun={onRun} />
        ))}
      </tbody>
    </table>
  )
}
