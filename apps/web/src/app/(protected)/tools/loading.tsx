import { Skeleton } from "@/components/ui/skeleton"

export default function ToolsLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Skeleton className="h-9 w-32 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="border rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="size-10 rounded" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
