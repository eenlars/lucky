import { Skeleton } from "@/components/ui/skeleton"

export default function StructuresLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Skeleton className="h-9 w-56 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Tree/Grid view */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="border rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="size-12 rounded" />
              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="ml-16 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
