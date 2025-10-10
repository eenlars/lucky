import { Skeleton } from "@/components/ui/skeleton"

export default function EditorLoading() {
  return (
    <div className="h-screen flex flex-col">
      {/* Top toolbar */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex">
        {/* Left panel */}
        <div className="w-64 border-r border-border p-4 space-y-3">
          <Skeleton className="h-6 w-32 mb-4" />
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>

        {/* Canvas area */}
        <div className="flex-1 p-8">
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-80 border-l border-border p-4 space-y-4">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}
