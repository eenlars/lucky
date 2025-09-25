"use client"

import type { FullTraceEntry } from "@/trace-visualization/types"
import { TimelineEntry } from "./TimelineEntry"

export const Timeline = ({ items }: { items: FullTraceEntry[] }) => {
  if (items.length === 0)
    return <p className="italic text-sm text-muted-foreground">No node invocations found for this run.</p>

  return (
    <div className="w-full space-y-4">
      <div className="text-sm font-medium text-foreground dark:text-foreground">Timeline ({items.length} nodes)</div>

      {/* horizontal scroll - ultra-compact cards */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-track-gray-100 dark:scrollbar-track-gray-800 scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        <div className="flex gap-3 py-2 px-1">
          {items.map((entry, idx) => (
            <div key={idx} className="flex-shrink-0 w-96">
              <TimelineEntry entry={entry} index={idx} isLastNode={idx === items.length - 1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
