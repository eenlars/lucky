"use client"
import {
  toWorkflowConfig,
  type WorkflowNodeConfig,
} from "@core/workflow/schema/workflow.types"
import { loadFromDSLClient } from "@core/workflow/setup/WorkflowLoader.client"
import { getDefaultModels } from "@runtime/settings/models"
import { useEffect, useMemo, useRef, useState } from "react"

type Dataset = {
  datasetId: string
  folder: string
  metaPath: string
  type: string
  fileName: string
  createdAt: string
}

type WorkflowCase = { workflowInput: string; workflowOutput: any }

type InputOutputPair = { input: string; output: string }

const TextIngestionForm = ({
  onSubmit,
}: {
  onSubmit: (goal: string, pairs: InputOutputPair[]) => Promise<void>
}) => {
  const [goal, setGoal] = useState("")
  const [pairs, setPairs] = useState<InputOutputPair[]>([
    { input: "", output: "" },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pairs.some((p) => !p.input.trim() || !p.output.trim())) {
      alert("Please fill in all input/output pairs")
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit(goal, pairs)
      setGoal("")
      setPairs([{ input: "", output: "" }])
    } finally {
      setIsSubmitting(false)
    }
  }

  const addPair = () => {
    setPairs([...pairs, { input: "", output: "" }])
  }

  const removePair = (index: number) => {
    if (pairs.length > 1) {
      setPairs(pairs.filter((_, i) => i !== index))
    }
  }

  const updatePair = (
    index: number,
    field: "input" | "output",
    value: string
  ) => {
    const newPairs = [...pairs]
    newPairs[index][field] = value
    setPairs(newPairs)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Workflow Goal</label>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g., Answer questions about scientific topics"
          className="w-full border rounded p-2"
          required
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Input/Output Pairs</label>
          <button
            type="button"
            onClick={addPair}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Add Pair
          </button>
        </div>

        {pairs.map((pair, index) => (
          <div key={index} className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pair {index + 1}</span>
              {pairs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePair(index)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              value={pair.input}
              onChange={(e) => updatePair(index, "input", e.target.value)}
              placeholder="Input / Question"
              className="w-full border rounded p-2"
              rows={2}
              required
            />
            <textarea
              value={pair.output}
              onChange={(e) => updatePair(index, "output", e.target.value)}
              placeholder="Expected Output / Answer"
              className="w-full border rounded p-2"
              rows={2}
              required
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {isSubmitting ? "Creating..." : "Create Text Ingestion"}
      </button>
    </form>
  )
}

export default function IngestionsDashboard() {
  const defaultNode: WorkflowNodeConfig = {
    nodeId: "start",
    description: "Answer the question",
    systemPrompt: "Answer clearly.",
    modelName: getDefaultModels().default,
    mcpTools: [],
    codeTools: [],
    handOffs: ["end"],
  }
  const [dslText, setDslText] = useState<string>(
    JSON.stringify(
      {
        nodes: [defaultNode],
        entryNodeId: "start",
      },
      null,
      2
    )
  )

  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("")
  const [cases, setCases] = useState<WorkflowCase[]>([])
  const [isLoadingCases, setIsLoadingCases] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runIndex, setRunIndex] = useState<number | null>(null)
  const [results, setResults] = useState<Record<number, any>>({})
  const [openOutput, setOpenOutput] = useState<Record<number, boolean>>({})
  const uploadRef = useRef<HTMLInputElement | null>(null)
  const [dslVerification, setDslVerification] = useState<{
    valid: boolean
    errors: string[]
    warnings: string[]
  } | null>(null)
  const [ingestionType, setIngestionType] = useState<"text" | "csv">("text")

  useEffect(() => {
    ;(async () => {
      const res = await fetch("/api/ingestions/list")
      if (res.ok) {
        const json = await res.json()
        setDatasets(json.datasets || [])
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const parsed = JSON.parse(dslText)
        const response = await fetch("/api/workflow/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflow: parsed }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        setDslVerification({
          valid: Boolean(result?.isValid),
          errors: Array.isArray(result?.errors) ? result.errors : [],
          warnings: [],
        })
      } catch (e: any) {
        setDslVerification({
          valid: false,
          errors: [
            e?.message === "Unexpected end of JSON input" ||
            e?.message === "Invalid JSON"
              ? "Invalid JSON"
              : `Verification Error: ${e?.message || "Unknown error"}`,
          ],
          warnings: [],
        })
      }
    })()
  }, [dslText])

  const selectedDataset = useMemo(
    () => datasets.find((d) => d.datasetId === selectedDatasetId) || null,
    [datasets, selectedDatasetId]
  )

  const loadCases = async () => {
    if (!selectedDatasetId) return
    setIsLoadingCases(true)
    setCases([])
    try {
      const res = await fetch("/api/ingestions/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: selectedDatasetId }),
      })
      const json = await res.json()
      if (json.success) setCases(json.cases)
    } finally {
      setIsLoadingCases(false)
    }
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fileInput = form.elements.namedItem("file") as HTMLInputElement
    const typeInput = form.elements.namedItem("type") as HTMLSelectElement
    const goalInput = form.elements.namedItem("goal") as HTMLInputElement
    const evalInput = form.elements.namedItem("evaluation") as HTMLInputElement
    const onlyCols = form.elements.namedItem(
      "onlyIncludeInputColumns"
    ) as HTMLInputElement

    const fd = new FormData()
    if (fileInput.files && fileInput.files[0])
      fd.append("file", fileInput.files[0])
    fd.append("type", typeInput.value)
    fd.append("goal", goalInput.value)
    if (evalInput.value) fd.append("evaluation", evalInput.value)
    if (onlyCols.value) fd.append("onlyIncludeInputColumns", onlyCols.value)

    const res = await fetch("/api/ingestions/upload", {
      method: "POST",
      body: fd,
    })
    if (res.ok) {
      const { dataset } = await res.json()
      setDatasets((d) => [
        {
          datasetId: dataset.datasetId,
          folder: `ingestions/${dataset.datasetId}`,
          metaPath: `ingestions/${dataset.datasetId}/meta.json`,
          type: dataset.type,
          fileName: dataset.file.name,
          createdAt: dataset.createdAt,
        },
        ...d,
      ])
      setSelectedDatasetId(dataset.datasetId)
      form.reset()
      if (uploadRef.current) uploadRef.current.value = ""
    }
  }

  const runOne = async (index: number) => {
    try {
      setRunIndex(index)
      setIsRunning(true)
      setResults((r) => ({ ...r, [index]: { loading: true } }))

      const parsed = JSON.parse(dslText)
      const cfgMaybe = toWorkflowConfig(parsed)
      if (!cfgMaybe) throw new Error("Invalid workflow config")
      const cfg = await loadFromDSLClient(cfgMaybe)

      const c = cases[index]
      const resp = await fetch("/api/workflow/run-many", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dslConfig: cfg, cases: [c] }),
      })
      const json = await resp.json()
      const first = json.results?.[0]
      setResults((r) => ({ ...r, [index]: first }))
    } catch (e: any) {
      setResults((r) => ({
        ...r,
        [index]: { success: false, error: e?.message },
      }))
    } finally {
      setIsRunning(false)
      setRunIndex(null)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-2xl font-semibold">Ingestions & Runner</h1>

        {/* 1. Paste Workflow DSL */}
        <section className="bg-white border rounded p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Workflow DSL</h2>
            <button
              onClick={() => {
                try {
                  const parsed = JSON.parse(dslText)
                  setDslText(JSON.stringify(parsed, null, 2))
                } catch {}
              }}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Format JSON
            </button>
          </div>
          <textarea
            className="w-full font-mono text-sm border rounded p-3 bg-gray-50"
            rows={12}
            value={dslText}
            onChange={(e) => setDslText(e.target.value)}
            spellCheck={false}
          />
          {dslVerification && (
            <div className="space-y-2">
              {dslVerification.valid ? (
                <div className="text-sm text-green-600">✓ Valid DSL</div>
              ) : (
                <>
                  {dslVerification.errors.map((error, i) => (
                    <div key={i} className="text-sm text-red-600">
                      ✗ {error}
                    </div>
                  ))}
                </>
              )}
              {dslVerification.warnings.map((warning, i) => (
                <div key={i} className="text-sm text-yellow-600">
                  ⚠ {warning}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. Create Ingestion */}
        <section className="bg-white border rounded p-4 space-y-4">
          <h2 className="text-lg font-medium">Create Ingestion</h2>

          {/* Type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setIngestionType("text")}
              className={`px-4 py-2 border rounded ${
                ingestionType === "text"
                  ? "bg-black text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setIngestionType("csv")}
              className={`px-4 py-2 border rounded ${
                ingestionType === "csv"
                  ? "bg-black text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              CSV
            </button>
          </div>

          {/* Text input form */}
          {ingestionType === "text" && (
            <TextIngestionForm
              onSubmit={async (goal, pairs) => {
                const fd = new FormData()
                fd.append("type", "text-multi")
                fd.append("goal", goal)
                fd.append("pairs", JSON.stringify(pairs))

                const res = await fetch("/api/ingestions/upload", {
                  method: "POST",
                  body: fd,
                })
                if (res.ok) {
                  const { dataset } = await res.json()
                  setDatasets((d) => [
                    {
                      datasetId: dataset.datasetId,
                      folder: `ingestions/${dataset.datasetId}`,
                      metaPath: `ingestions/${dataset.datasetId}/meta.json`,
                      type: dataset.type,
                      fileName: "text-input",
                      createdAt: dataset.createdAt,
                    },
                    ...d,
                  ])
                  setSelectedDatasetId(dataset.datasetId)
                }
              }}
            />
          )}

          {/* CSV upload form */}
          {ingestionType === "csv" && (
            <form
              onSubmit={handleUpload}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              <input
                ref={uploadRef}
                type="file"
                name="file"
                accept=".csv"
                className="border rounded p-2"
                required
              />
              <input name="type" type="hidden" value="csv" />
              <input
                name="goal"
                placeholder="Goal description"
                className="border rounded p-2"
                required
              />
              <input
                name="evaluation"
                placeholder="column:expected_output"
                className="border rounded p-2"
              />
              <input
                name="onlyIncludeInputColumns"
                placeholder="column1,column2 (optional)"
                className="border rounded p-2"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded md:col-span-2"
              >
                Upload CSV
              </button>
            </form>
          )}
        </section>

        {/* 3. Datasets list */}
        <section className="bg-white border rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Datasets</h2>
            <button
              onClick={loadCases}
              disabled={!selectedDatasetId}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Load cases
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {datasets.map((d) => (
              <button
                key={d.datasetId}
                onClick={() => setSelectedDatasetId(d.datasetId)}
                className={`px-3 py-1 border rounded ${selectedDatasetId === d.datasetId ? "bg-black text-white" : "hover:bg-gray-50"}`}
                title={`${d.type} • ${d.fileName}`}
              >
                {d.datasetId}
              </button>
            ))}
            {datasets.length === 0 && (
              <div className="text-sm text-gray-500">
                No datasets yet. Upload one above.
              </div>
            )}
          </div>

          {selectedDataset && (
            <div className="text-sm text-gray-600">
              Selected: {selectedDataset.datasetId} • {selectedDataset.type} •{" "}
              {selectedDataset.fileName}
            </div>
          )}
        </section>

        {/* 4. Cases table */}
        <section className="bg-white border rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Workflow Inputs</h2>
            {isLoadingCases && (
              <span className="text-sm text-gray-500">Loading cases…</span>
            )}
          </div>
          {cases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Input</th>
                    <th className="py-2 pr-4">Expected</th>
                    <th className="py-2 pr-4">Run</th>
                    <th className="py-2 pr-4">Fitness</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c, i) => {
                    const res = results[i]
                    const fitness = res?.data?.[0]?.fitness
                    const feedback = res?.data?.[0]?.feedback
                    const finalOut = res?.data?.[0]?.finalWorkflowOutputs
                    const loading = res?.loading && runIndex === i && isRunning
                    return (
                      <tr key={i} className="border-b align-top">
                        <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                        <td className="py-2 pr-4 max-w-xl">
                          <pre className="whitespace-pre-wrap break-words">
                            {c.workflowInput}
                          </pre>
                        </td>
                        <td className="py-2 pr-4 max-w-sm">
                          <pre className="whitespace-pre-wrap break-words text-gray-600">
                            {typeof c.workflowOutput === "string"
                              ? c.workflowOutput
                              : JSON.stringify(c.workflowOutput)}
                          </pre>
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            onClick={() => runOne(i)}
                            disabled={isRunning}
                            className="px-3 py-1 bg-black text-white rounded disabled:opacity-50"
                          >
                            {loading ? "Running…" : "Run"}
                          </button>
                          {res && res.success && finalOut && (
                            <button
                              onClick={() =>
                                setOpenOutput((s) => ({ ...s, [i]: !s[i] }))
                              }
                              className="ml-2 px-2 py-1 border rounded text-xs hover:bg-gray-50"
                            >
                              {openOutput[i] ? "Hide output" : "View output"}
                            </button>
                          )}
                          {openOutput[i] && finalOut && (
                            <div className="mt-2 max-w-md text-xs p-2 border rounded bg-gray-50 whitespace-pre-wrap break-words">
                              {finalOut}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {res && res.success && fitness ? (
                            <div className="inline-flex items-center gap-2">
                              <span
                                className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs"
                                title={feedback || "No feedback"}
                              >
                                score {Number(fitness.score).toFixed(1)} • acc{" "}
                                {Number(fitness.accuracy).toFixed(1)} • nov{" "}
                                {Number(fitness.novelty).toFixed(1)}
                              </span>
                            </div>
                          ) : res && !res.success ? (
                            <span className="text-red-600">
                              {res.error || "Failed"}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No cases loaded.</div>
          )}
        </section>
      </div>
    </div>
  )
}
