"use client"

import type { FullTraceEntry } from "@/features/trace-visualization/types"
import { TimelineEntry } from "./TimelineEntry"

export const Timeline = ({ items }: { items: FullTraceEntry[] }) => {
  if (items.length === 0)
    return <p className="italic text-sm text-sidebar-foreground/70">No node invocations found for this run.</p>

  return (
    <div className="w-full space-y-4">
      <div className="text-lg font-medium text-sidebar-foreground">Timeline ({items.length} nodes)</div>

      {/* horizontal scroll - ultra-compact cards */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-track-sidebar-accent scrollbar-thumb-sidebar-border">
        <div className="flex gap-4 py-2 px-1">
          {items.map((entry, idx) => (
            <div key={idx} className="flex-shrink-0 w-[500px]">
              <TimelineEntry entry={entry} index={idx} isLastNode={idx === items.length - 1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
