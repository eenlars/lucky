import { Skeleton } from "@/components/ui/skeleton"

export default function DevLoading() {
  return (
    <div className="flex h-full bg-background">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r border-border bg-sidebar/30">
        <div className="p-6 border-b border-border">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="p-3 space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="size-10 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}
