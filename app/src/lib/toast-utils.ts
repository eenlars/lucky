import { toast } from "sonner"

// standard toast configurations for consistency
export const showToast = {
  // success messages
  success: {
    save: (message = "Changes saved successfully") => toast.success(message),
    run: (message = "Workflow execution started") => toast.success(message),
    import: (message = "Import completed successfully") => toast.success(message),
    export: (message = "Export completed successfully") => toast.success(message),
    delete: (message = "Deleted successfully") => toast.success(message),
    generic: (message: string) => toast.success(message),
  },

  // error messages
  error: {
    save: (error?: string) => 
      toast.error(error || "Failed to save changes"),
    run: (error?: string) => 
      toast.error(error || "Failed to execute workflow"),
    validation: (error?: string) => 
      toast.error(error || "Validation failed"),
    network: (error?: string) => 
      toast.error(error || "Network error occurred"),
    generic: (error?: string) => 
      toast.error(error || "An error occurred"),
  },

  // info messages
  info: {
    processing: (message = "Processing...") => toast.info(message),
    loading: (message = "Loading...") => toast.info(message),
    autoSave: (message = "Auto-save enabled") => toast.info(message),
  },

  // warning messages
  warning: {
    unsavedChanges: () => toast.warning("You have unsaved changes"),
    longOperation: () => toast.warning("This operation may take a while"),
  },
}

// promise-based toast for async operations
export const toastPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading?: string
    success?: string | ((data: T) => string)
    error?: string | ((error: any) => string)
  }
) => {
  return toast.promise(promise, {
    loading: messages.loading || "Loading...",
    success: messages.success || "Success!",
    error: messages.error || "Error occurred",
  })
}