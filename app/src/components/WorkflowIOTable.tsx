"use client"

import { useState } from "react"

export type WorkflowIO = { id: string; input: string; expected: string }

type RunResult = {
  fitness?: any
  output?: any
  error?: string
  feedback?: string
  wfInvocationId?: string
}

type Props = {
  ios: WorkflowIO[]
  resultsById?: Record<string, RunResult>
  busyIds?: Set<string>
  onUpdate: (ioId: string, patch: Partial<WorkflowIO>) => Promise<void>
  onDelete: (ioId: string) => Promise<void>
  onRun: (io: WorkflowIO) => Promise<void>
  onCancel: (ioId: string) => void
}

export default function WorkflowIOTable({
  ios,
  resultsById = {},
  busyIds,
  onUpdate,
  onDelete,
  onRun,
  onCancel,
}: Props) {
  const [edits, setEdits] = useState<
    Record<string, { input: string; expected: string }>
  >({})

  const getValue = (io: WorkflowIO, key: "input" | "expected") =>
    edits[io.id]?.[key] ?? io[key]

  const handleSave = async (io: WorkflowIO) => {
    const e = edits[io.id]
    if (!e) return
    const patch: Partial<WorkflowIO> = {}
    if (e.input !== io.input) patch.input = e.input
    if (e.expected !== io.expected) patch.expected = e.expected
    if (Object.keys(patch).length === 0) return
    await onUpdate(io.id, patch)
    setEdits((m) => {
      const { [io.id]: _, ...rest } = m
      return rest
    })
  }

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
        {ios.map((io, i) => {
          const busy = busyIds?.has(io.id)
          const res = resultsById[io.id]
          const canRun = Boolean(getValue(io, "input")?.trim())
          
          return (
            <tr key={io.id} className={`border-b ${busy ? "bg-blue-50" : ""}`}>
              <td className="py-2 px-3 text-gray-500">{i + 1}</td>
              <td className="py-2 px-3">
                <textarea
                  className="w-full border rounded p-1.5 text-xs font-mono resize-none focus:border-blue-500 focus:outline-none"
                  rows={2}
                  value={getValue(io, "input")}
                  onChange={(e) =>
                    setEdits((m) => ({
                      ...m,
                      [io.id]: {
                        ...(m[io.id] ?? { input: io.input, expected: io.expected }),
                        input: e.target.value,
                      },
                    }))
                  }
                  onBlur={() => handleSave(io)}
                  disabled={busy}
                />
              </td>
              <td className="py-2 px-3">
                <textarea
                  className="w-full border rounded p-1.5 text-xs font-mono resize-none focus:border-blue-500 focus:outline-none"
                  rows={2}
                  value={getValue(io, "expected")}
                  onChange={(e) =>
                    setEdits((m) => ({
                      ...m,
                      [io.id]: {
                        ...(m[io.id] ?? { input: io.input, expected: io.expected }),
                        expected: e.target.value,
                      },
                    }))
                  }
                  onBlur={() => handleSave(io)}
                  disabled={busy}
                />
              </td>
              <td className="py-2 px-3">
                {res?.output ? (
                  <div className="max-h-16 overflow-auto text-xs font-mono bg-gray-50 rounded p-1.5">
                    {typeof res.output === "string" ? res.output : JSON.stringify(res.output, null, 2)}
                  </div>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-2 px-3">
                {res?.error ? (
                  <span className="text-red-600 text-xs">Error</span>
                ) : res?.fitness ? (
                  <div>
                    <span className="text-green-700 text-xs font-medium">
                      {typeof res.fitness?.accuracy === "number"
                        ? `${Math.round(res.fitness.accuracy * 100)}%`
                        : "✓"}
                    </span>
                    {res.wfInvocationId && (
                      <a
                        href={`/trace/${res.wfInvocationId}`}
                        target="_blank"
                        className="ml-2 text-xs text-blue-600 hover:underline cursor-pointer"
                      >
                        trace
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-2 px-3">
                <div className="flex gap-1">
                  <button
                    className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                      busy
                        ? "bg-gray-600 text-white"
                        : canRun
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (busy) {
                        onCancel(io.id)
                      } else if (canRun) {
                        onRun({ ...io, ...(edits[io.id] ?? {}) })
                      }
                    }}
                    disabled={!canRun && !busy}
                  >
                    {busy ? "Stop" : "Run"}
                  </button>
                  <button
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    onClick={() => onDelete(io.id)}
                    disabled={busy}
                  >
                    ×
                  </button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}