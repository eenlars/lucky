"use client"

import { useRef, useState } from "react"

export type WorkflowIO = { id: string; input: string; expected: string }

type RunResult = { fitness?: any; output?: string; error?: string }

type Props = {
  ios: WorkflowIO[]
  resultsById?: Record<string, RunResult>
  busyIds?: Set<string>
  onCreate: (io: { input: string; expected: string }) => Promise<void>
  onUpdate: (ioId: string, patch: Partial<WorkflowIO>) => Promise<void>
  onDelete: (ioId: string) => Promise<void>
  onRun: (io: WorkflowIO) => Promise<void>
}

export default function WorkflowIOTable({
  ios,
  resultsById = {},
  busyIds,
  onCreate,
  onUpdate,
  onDelete,
  onRun,
}: Props) {
  const [edits, setEdits] = useState<
    Record<string, { input: string; expected: string }>
  >({})
  const [composer, setComposer] = useState({ input: "", expected: "" })
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const isDirty = (io: WorkflowIO) => {
    const e = edits[io.id]
    return !!e && (e.input !== io.input || e.expected !== io.expected)
  }

  const getValue = (io: WorkflowIO, key: "input" | "expected") =>
    edits[io.id]?.[key] ?? (io as any)[key]

  const canAdd =
    composer.input.trim().length > 0 && composer.expected.trim().length > 0

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
            <th className="py-2 pr-4 w-8">#</th>
            <th className="py-2 pr-4 w-1/2">Input</th>
            <th className="py-2 pr-4 w-1/2">Expected</th>
            <th className="py-2 pr-4">Actions</th>
            <th className="py-2 pr-4">Fitness</th>
          </tr>
        </thead>
        <tbody>
          {ios.map((io, i) => {
            const busy = busyIds?.has(io.id)
            const dirty = isDirty(io)
            const res = resultsById[io.id]
            return (
              <tr key={io.id} className="border-b align-top">
                <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                <td className="py-2 pr-4">
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
                    onKeyDown={async (e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault()
                        await handleSave(io)
                      }
                    }}
                    disabled={busy}
                  />
                </td>
                <td className="py-2 pr-4">
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
                    onKeyDown={async (e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault()
                        await handleSave(io)
                      }
                    }}
                    disabled={busy}
                  />
                </td>
                <td className="py-2 pr-4">
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 bg-black text-white rounded disabled:opacity-50"
                      onClick={async () => {
                        if (dirty) await handleSave(io)
                        await onRun({ ...io, ...(edits[io.id] ?? {}) })
                      }}
                      disabled={busy}
                    >
                      {busy ? "Running…" : "Run"}
                    </button>
                    <button
                      className={`px-3 py-1 border rounded ${dirty ? "border-blue-600 text-blue-700" : "opacity-50 cursor-default"}`}
                      onClick={() => handleSave(io)}
                      disabled={!dirty || !!busy}
                    >
                      Save
                    </button>
                    <button
                      className="px-3 py-1 border rounded hover:bg-gray-50"
                      onClick={() =>
                        setEdits((m) => {
                          const { [io.id]: _, ...rest } = m
                          return rest
                        })
                      }
                      disabled={!dirty || !!busy}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-3 py-1 border rounded text-red-700 hover:bg-red-50"
                      onClick={() => onDelete(io.id)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  {res?.error ? (
                    <span className="text-red-600">{res.error}</span>
                  ) : res?.fitness ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                      {JSON.stringify(res.fitness)}
                    </span>
                  ) : null}
                </td>
              </tr>
            )
          })}

          <tr className="align-top">
            <td className="py-2 pr-4 text-gray-500">+</td>
            <td className="py-2 pr-4">
              <textarea
                ref={inputRef}
                className="w-full border rounded p-2 resize-y"
                rows={3}
                placeholder="New input…"
                value={composer.input}
                onChange={(e) =>
                  setComposer((c) => ({ ...c, input: e.target.value }))
                }
                onKeyDown={async (e) => {
                  const can = composer.input.trim() && composer.expected.trim()
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && can) {
                    e.preventDefault()
                    await onCreate(composer)
                    setComposer({ input: "", expected: "" })
                    inputRef.current?.focus()
                  }
                }}
              />
            </td>
            <td className="py-2 pr-4">
              <textarea
                className="w-full border rounded p-2 resize-y"
                rows={3}
                placeholder="New expected…"
                value={composer.expected}
                onChange={(e) =>
                  setComposer((c) => ({ ...c, expected: e.target.value }))
                }
                onKeyDown={async (e) => {
                  const can = composer.input.trim() && composer.expected.trim()
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && can) {
                    e.preventDefault()
                    await onCreate(composer)
                    setComposer({ input: "", expected: "" })
                    inputRef.current?.focus()
                  }
                }}
              />
            </td>
            <td className="py-2 pr-4">
              <button
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                disabled={!(composer.input.trim() && composer.expected.trim())}
                onClick={async () => {
                  await onCreate(composer)
                  setComposer({ input: "", expected: "" })
                  inputRef.current?.focus()
                }}
              >
                Add
              </button>
            </td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  )
}
