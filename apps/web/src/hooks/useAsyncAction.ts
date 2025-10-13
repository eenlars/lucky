import { logException } from "@/lib/error-logger"
import { type ErrorMessage, getErrorMessage } from "@/lib/error-messages"
import { useCallback, useState } from "react"

interface AsyncActionState<T> {
  isLoading: boolean
  error: ErrorMessage | null
  data: T | null
}

interface UseAsyncActionOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: ErrorMessage) => void
}

/**
 * Hook for handling async actions with loading and error states
 * Follows design guide principles: speed, clarity, plain language
 */
export function useAsyncAction<T = any>(options?: UseAsyncActionOptions<T>) {
  const [state, setState] = useState<AsyncActionState<T>>({
    isLoading: false,
    error: null,
    data: null,
  })

  const execute = useCallback(
    async (asyncFn: () => Promise<T>) => {
      setState({ isLoading: true, error: null, data: null })

      try {
        const result = await asyncFn()
        setState({ isLoading: false, error: null, data: result })
        options?.onSuccess?.(result)
        return result
      } catch (err) {
        logException(err, {
          location: "/hook/useAsyncAction",
        })
        const errorMessage = getErrorMessage(err)
        setState({ isLoading: false, error: errorMessage, data: null })
        options?.onError?.(errorMessage)
        throw err
      }
    },
    [options],
  )

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, data: null })
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    execute,
    reset,
    clearError,
  }
}
