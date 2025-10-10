import { Skeleton } from "@/components/ui/skeleton"

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-white pt-24">
      <div className="max-w-4xl mx-auto px-8">
        <div className="text-center mb-12">
          <Skeleton className="h-14 w-3/4 mx-auto mb-6" />
          <Skeleton className="h-6 w-2/3 mx-auto" />
        </div>

        <div className="mb-16">
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center p-8">
              <Skeleton className="w-16 h-16 mb-6 rounded-full" />
              <Skeleton className="h-7 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
