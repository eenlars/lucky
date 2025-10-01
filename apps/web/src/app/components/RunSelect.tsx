"use client"

export interface EvolutionRun {
  run_id: string
  goal_text: string
  status: string
  start_time: string
  end_time: string | null
  config: any
  total_invocations?: number
  successful_invocations?: number
  generation_count?: number
}

export function defaultFormatRunTitle(run: EvolutionRun) {
  const date = new Date(run.start_time).toLocaleDateString()
  const goalPreview = run.goal_text.slice(0, 40) + (run.goal_text.length > 40 ? "..." : "")
  const mode = run.config?.mode || "unknown"
  const successRate =
    run.total_invocations && run.total_invocations > 0
      ? `${Math.round(((run.successful_invocations || 0) / run.total_invocations) * 100)}%`
      : "0%"
  const genInfo = run.generation_count ? `${run.generation_count} generations` : "0 generations"
  const invocationInfo = `${run.total_invocations || 0} invocations`
  const statusIcon = run.successful_invocations && run.successful_invocations > 0 ? "✅" : "⚠️"

  return `${statusIcon} ${date} - ${mode} - ${genInfo}, ${invocationInfo} (${successRate}) - ${goalPreview}`
}

export function RunSelect({
  id,
  label,
  runs,
  value,
  onChange,
  loading,
  formatRunTitle = defaultFormatRunTitle,
  placeholder = "Select a run...",
}: {
  id: string
  label: string
  runs: EvolutionRun[]
  value: string
  onChange: (runId: string) => void
  loading?: boolean
  formatRunTitle?: (run: EvolutionRun) => string
  placeholder?: string
}) {
  return (
    <div className="flex items-center space-x-3">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={loading || runs.length === 0}
        className="block min-w-[420px] max-w-[600px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 truncate"
      >
        {runs.length === 0 ? (
          <option value="">No runs available</option>
        ) : (
          <>
            <option value="">{placeholder}</option>
            {runs.map(run => (
              <option key={run.run_id} value={run.run_id}>
                {formatRunTitle(run)}
              </option>
            ))}
          </>
        )}
      </select>
      {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
    </div>
  )
}
