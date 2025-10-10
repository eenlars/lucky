import { TableSkeleton } from "@/components/loading/Skeleton"

export default function InvocationsLoading() {
  return (
    <div className="p-6">
      <TableSkeleton rows={8} columns={8} />
    </div>
  )
}
