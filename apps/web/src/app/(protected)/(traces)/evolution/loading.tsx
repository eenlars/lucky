import { Skeleton } from "@/components/ui/skeleton"

export default function EvolutionLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Skeleton className="h-9 w-56 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Graph area */}
      <div className="border rounded-lg p-8 mb-6">
        <Skeleton className="h-96 w-full rounded" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border rounded-lg p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
