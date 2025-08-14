import { useState, useCallback, useRef } from "react"
import type { WorkflowIO } from "../WorkflowIOTable"

interface ExecutionState {
  status: 'idle' | 'preparing' | 'running' | 'success' | 'error' | 'timeout' | 'cancelled'
  progress: number // 0-100
  message?: string
  startTime?: number
  endTime?: number
  retryCount: number
}

interface UseWorkflowExecutionOptions {
  maxRetries?: number
  timeoutMs?: number
  onProgress?: (progress: number) => void
  onStatusChange?: (status: ExecutionState['status']) => void
}

export function useWorkflowExecution(options: UseWorkflowExecutionOptions = {}) {
  const {
    maxRetries = 3,
    timeoutMs = 120000, // 2 minutes
    onProgress,
    onStatusChange
  } = options

  const [state, setState] = useState<ExecutionState>({
    status: 'idle',
    progress: 0,
    retryCount: 0
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)

  const updateState = useCallback((updates: Partial<ExecutionState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates }
      
      if (updates.status && updates.status !== prev.status) {
        onStatusChange?.(updates.status)
      }
      
      if (updates.progress !== undefined && updates.progress !== prev.progress) {
        onProgress?.(updates.progress)
      }
      
      return newState
    })
  }, [onProgress, onStatusChange])

  const executeWorkflow = useCallback(async (
    runFunction: (workflowConfig: any, io: WorkflowIO) => Promise<void>,
    workflowConfig: any,
    io: WorkflowIO
  ) => {
    // Cancel any existing execution
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Clear any existing timeout
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
    }

    const startTime = Date.now()
    abortControllerRef.current = new AbortController()

    updateState({
      status: 'preparing',
      progress: 10,
      message: 'Preparing workflow execution...',
      startTime,
      endTime: undefined
    })

    // Set timeout
    timeoutIdRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        updateState({
          status: 'timeout',
          progress: 0,
          message: `Execution timed out after ${timeoutMs / 1000} seconds`,
          endTime: Date.now()
        })
      }
    }, timeoutMs)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setState(prev => {
        if (prev.status === 'running' && prev.progress < 90) {
          return { ...prev, progress: Math.min(90, prev.progress + 10) }
        }
        return prev
      })
    }, 2000)

    try {
      updateState({
        status: 'running',
        progress: 20,
        message: 'Executing workflow...'
      })

      await runFunction(workflowConfig, io)

      // Check if we were cancelled
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Execution cancelled')
      }

      updateState({
        status: 'success',
        progress: 100,
        message: 'Workflow completed successfully',
        endTime: Date.now()
      })

    } catch (error) {
      const endTime = Date.now()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (errorMessage === 'Execution cancelled') {
        updateState({
          status: 'cancelled',
          progress: 0,
          message: 'Execution was cancelled',
          endTime
        })
      } else if (state.retryCount < maxRetries) {
        // Retry logic
        updateState({
          status: 'error',
          progress: 0,
          message: `Error: ${errorMessage}. Retrying... (${state.retryCount + 1}/${maxRetries})`,
          retryCount: state.retryCount + 1,
          endTime
        })

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (state.retryCount + 1)))
        
        // Recursive retry
        clearInterval(progressInterval)
        return executeWorkflow(runFunction, workflowConfig, io)
      } else {
        updateState({
          status: 'error',
          progress: 0,
          message: `Failed after ${maxRetries} retries: ${errorMessage}`,
          endTime
        })
      }
    } finally {
      clearInterval(progressInterval)
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
      abortControllerRef.current = null
    }
  }, [maxRetries, timeoutMs, state.retryCount, updateState])

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      updateState({
        status: 'cancelled',
        progress: 0,
        message: 'Execution cancelled by user'
      })
    }
  }, [updateState])

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      progress: 0,
      retryCount: 0
    })
  }, [])

  return {
    state,
    executeWorkflow,
    cancel,
    reset,
    isRunning: state.status === 'preparing' || state.status === 'running',
    executionTime: state.startTime && state.endTime ? state.endTime - state.startTime : undefined
  }
}