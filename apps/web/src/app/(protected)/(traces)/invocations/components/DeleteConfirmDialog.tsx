import { Button } from "@/components/ui/button"

interface DeleteConfirmDialogProps {
  isOpen: boolean
  selectedCount: number
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  isOpen,
  selectedCount,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Confirm Deletion</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete {selectedCount} selected invocation{selectedCount > 1 ? "s" : ""}? This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel} disabled={isDeleting} variant="outline">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isDeleting} variant="destructive">
            {isDeleting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            )}
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  )
}
