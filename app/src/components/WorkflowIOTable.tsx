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
  const [openFitnessForId, setOpenFitnessForId] = useState<string | null>(null)

  const isDirty = (io: WorkflowIO) => {
    const e = edits[io.id]
    return !!e && (e.input !== io.input || e.expected !== io.expected)
  }

  const getValue = (io: WorkflowIO, key: "input" | "expected") =>
    edits[io.id]?.[key] ?? (io as any)[key]

  // derived in-place when needed

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
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-3 pr-4 w-8">#</th>
            <th className="py-3 pr-4 w-1/5">Input</th>
            <th className="py-3 pr-4 w-2/5">Expected</th>
            <th className="py-3 pr-4 w-2/5">Real Output</th>
            <th className="py-3 pr-4">Fitness</th>
            <th className="py-3 pr-4 w-40">Actions</th>
          </tr>
        </thead>
        <tbody>
          {ios.map((io, i) => {
            const busy = busyIds?.has(io.id)
            const dirty = isDirty(io)
            const res = resultsById[io.id]
            const canRun = Boolean(String(getValue(io, "input") ?? "").trim())
            return (
              <tr key={io.id} className="border-b align-top">
                <td className="py-3 pr-4 text-gray-500">{i + 1}</td>
                <td className="py-3 pr-4">
                  <textarea
                    className="w-full border rounded p-2 resize-y"
                    rows={3}
                    value={getValue(io, "input")}
                    onChange={(e) =>
                      setEdits((m) => ({
                        ...m,
                        [io.id]: {
                          ...(m[io.id] ?? {
                            input: io.input,
                            expected: io.expected,
                          }),
                          input: e.target.value,
                        },
                      }))
                    }
                    onBlur={async () => {
                      await handleSave(io)
                    }}
                    disabled={busy}
                  />
                </td>
                <td className="py-3 pr-4">
                  <textarea
                    className="w-full border rounded p-2 resize-y"
                    rows={3}
                    value={getValue(io, "expected")}
                    onChange={(e) =>
                      setEdits((m) => ({
                        ...m,
                        [io.id]: {
                          ...(m[io.id] ?? {
                            input: io.input,
                            expected: io.expected,
                          }),
                          expected: e.target.value,
                        },
                      }))
                    }
                    onBlur={async () => {
                      await handleSave(io)
                    }}
                    disabled={busy}
                  />
                </td>
                <td className="py-3 pr-4">
                  {res?.output ? (
                    typeof res.output === "string" ? (
                      <div className="max-h-28 overflow-auto whitespace-pre-wrap text-gray-800 border rounded p-2 bg-gray-50">
                        {res.output}
                      </div>
                    ) : (
                      <pre className="max-h-28 overflow-auto text-gray-800 border rounded p-2 bg-gray-50">
                        {`${JSON.stringify(res.output, null, 2)}`}
                      </pre>
                    )
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="relative">
                    {res?.error ? (
                      <span className="text-red-600">{res.error}</span>
                    ) : res?.fitness ? (
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs hover:bg-green-200 transition-colors"
                          onClick={() =>
                            setOpenFitnessForId((cur) =>
                              cur === io.id ? null : io.id
                            )
                          }
                        >
                          {(() => {
                            const a = res.fitness?.accuracy
                            if (typeof a === "number") {
                              const pct =
                                a <= 1 ? Math.round(a * 100) : Math.round(a)
                              return `Acc ${pct}%`
                            }
                            return `Acc ${String(a ?? "-")}`
                          })()}
                        </button>
                        {res?.wfInvocationId ? (
                          <a
                            href={`/trace/${res.wfInvocationId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-700 hover:text-blue-900 underline"
                          >
                            Trace
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                    {openFitnessForId === io.id && res?.fitness ? (
                      <div className="absolute z-10 mt-2 w-64 max-h-64 overflow-auto border rounded shadow-sm bg-white p-2 text-xs text-gray-700">
                        <pre className="whitespace-pre-wrap">
                          {`${JSON.stringify(res.fitness, null, 2)}`}
                        </pre>
                        {res?.feedback ? (
                          <div className="mt-2">
                            <div className="font-semibold text-gray-800 mb-1">
                              Feedback
                            </div>
                            <div className="whitespace-pre-wrap text-gray-700">
                              {res.feedback}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-start gap-2">
                    <button
                      className={`px-3 py-1 rounded text-white ${busy ? "bg-gray-700 hover:bg-gray-800" : "bg-black hover:bg-gray-900"} disabled:opacity-50 transition-colors`}
                      onClick={async () => {
                        if (busy) {
                          onCancel(io.id)
                        } else {
                          if (dirty) await handleSave(io)
                          await onRun({ ...io, ...(edits[io.id] ?? {}) })
                        }
                      }}
                      disabled={!canRun}
                    >
                      {busy ? "Cancel Run" : "Run"}
                    </button>
                    <button
                      className="ml-auto px-3 py-1 border rounded text-red-700 hover:bg-red-50"
                      onClick={() => onDelete(io.id)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
