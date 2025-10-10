import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <Skeleton className="h-9 w-32 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="space-y-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border rounded-lg p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
