"use client"

import { useState } from "react"

export type QAEntry = {
  question: string
  answer: string
}

export default function TextIngestionForm({
  onSubmit,
}: {
  onSubmit: (goal: string, pairs: QAEntry[]) => Promise<void> | void
}) {
  const [goal, setGoal] = useState("")
  const [pairs, setPairs] = useState<QAEntry[]>([{ question: "", answer: "" }])
  const [submitting, setSubmitting] = useState(false)

  const updatePair = (index: number, key: keyof QAEntry, value: string) => {
    setPairs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [key]: value }
      return copy
    })
  }

  const addPair = () =>
    setPairs((prev) => [...prev, { question: "", answer: "" }])
  const removePair = (index: number) =>
    setPairs((prev) => prev.filter((_, i) => i !== index))

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!goal.trim()) return
        const cleaned = pairs.filter(
          (p) => p.question.trim().length > 0 && p.answer.trim().length > 0
        )
        if (cleaned.length === 0) return
        try {
          setSubmitting(true)
          await onSubmit(goal, cleaned)
          setGoal("")
          setPairs([{ question: "", answer: "" }])
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <input
        name="goal"
        placeholder="Goal description"
        className="w-full border rounded p-2"
        required
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
      />

      <div className="space-y-3">
        {pairs.map((pair, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <textarea
              placeholder="Question / Input"
              className="w-full border rounded p-2 md:col-span-2"
              rows={3}
              value={pair.question}
              onChange={(e) => updatePair(i, "question", e.target.value)}
              required
            />
            <textarea
              placeholder="Expected Answer / Output"
              className="w-full border rounded p-2"
              rows={3}
              value={pair.answer}
              onChange={(e) => updatePair(i, "answer", e.target.value)}
              required
            />
            <div className="md:col-span-3 flex gap-2">
              <button
                type="button"
                className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
                onClick={() => removePair(i)}
                disabled={pairs.length === 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addPair}
          className="px-3 py-1 border rounded hover:bg-gray-50"
        >
          Add another pair
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded"
          disabled={submitting}
        >
          {submitting ? "Creating…" : "Create Text Ingestion"}
        </button>
      </div>
    </form>
  )
}
