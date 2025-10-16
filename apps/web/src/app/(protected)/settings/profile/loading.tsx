import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileLoading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <Skeleton className="h-9 w-32 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Profile info card */}
      <div className="border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-6 mb-6">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-28 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  )
}
