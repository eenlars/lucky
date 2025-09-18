/**
 * Unit Tests for WorkflowEventContext.ts - Workflow Event Context Manager
 * 
 * Tests the workflow event emission and context management including:
 * - Event emission with context merging
 * - Node context scoping
 * - Event timing and correlation
 * - Error handling in scoped operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorkflowEventContext } from '@core/utils/observability/WorkflowEventContext'
import { obs, setSink, MemorySink } from '@core/utils/observability/obs'
import type { Sink } from '@core/utils/observability/obs'
import { ContextBuilder, AsyncTestUtils } from '@core/__tests__/test-data-builders'

describe('WorkflowEventContext - Event Context Manager', () => {
  let memorySink: MemorySink
  let mockSink: Sink
  let eventContext: WorkflowEventContext
  let baseContext: any
  
  beforeEach(() => {
    // Reset to clean state
    memorySink = new MemorySink()
    mockSink = {
      event: vi.fn()
    }
    setSink(mockSink)
    
    // Create base context for testing
    baseContext = ContextBuilder.create()
      .withWorkflowContext({
        wfId: 'test-workflow-123',
        wfVersionId: 'v2.1.0',
        invocationId: 'test-invocation-456'
      })
      .build()
    
    eventContext = new WorkflowEventContext(baseContext)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Workflow Lifecycle Events', () => {
    it('should emit workflow started events with correct context', () => {
      // Act
      eventContext.workflowStarted({
        nodeCount: 5,
        entryNodeId: 'start-node',
        goal: 'Process user request'
      })
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'workflow:started',
          wfId: 'test-workflow-123',
          wfVersionId: 'v2.1.0',
          invocationId: 'test-invocation-456',
          nodeCount: 5,
          entryNodeId: 'start-node',
          goal: 'Process user request'
        })
      )
    })

    it('should emit workflow completed events with metrics', () => {
      // Act
      eventContext.workflowCompleted({
        duration: 15000,
        totalCost: 0.125,
        nodeInvocations: 8,
        status: 'success'
      })
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'workflow:completed',
          wfId: 'test-workflow-123',
          invocationId: 'test-invocation-456',
          duration: 15000,
          totalCost: 0.125,
          nodeInvocations: 8,
          status: 'success'
        })
      )
    })

    it('should emit workflow failed events with error details', () => {
      // Act
      eventContext.workflowCompleted({
        duration: 3000,
        totalCost: 0.025,
        nodeInvocations: 2,
        status: 'failed',
        error: 'Node execution timeout'
      })
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'Node execution timeout'
        })
      )
    })
  })

  describe('Node Execution Events', () => {
    it('should emit node execution started events', () => {
      // Act
      eventContext.nodeExecutionStarted({
        nodeId: 'transform-node-001',
        nodeType: 'transform-node',
        attempt: 1
      })
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        'node:execution:started',
        expect.objectContaining({
          event: 'node:execution:started',
          nodeId: 'transform-node-001',
          nodeType: 'transform-node',
          attempt: 1,
          wfId: 'test-workflow-123',
          invocationId: 'test-invocation-456'
        })
      )
    })

    it('should emit node execution completed events with metrics', () => {
      // Act
      eventContext.nodeExecutionCompleted({
        nodeId: 'llm-node-002',
        nodeType: 'llm-node',
        duration: 2500,
        cost: 0.0125,
        status: 'success',
        outputTokens: 100,
        inputTokens: 50
      })
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        'node:execution:completed',
        expect.objectContaining({
          event: 'node:execution:completed',
          nodeId: 'llm-node-002',
          nodeType: 'llm-node',
          duration: 2500,
          cost: 0.0125,
          status: 'success',
          outputTokens: 100,
        inputTokens: 50
        })
      )
    })

    it('should emit node execution failed events with error details', () => {
      // Act
      eventContext.nodeExecutionCompleted({
        nodeId: 'api-node-003',
        nodeType: 'api-node',
        duration: 5000,
        cost: 0.001,
        status: 'failed',
        error: 'API rate limit exceeded'
      })
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        'node:execution:completed',
        expect.objectContaining({
          status: 'failed',
          error: 'API rate limit exceeded'
        })
      )
    })
  })

  describe('Message Flow Events', () => {
    it('should emit message queued events', () => {
      // Act
      eventContext.messageQueued({
        fromNodeId: 'input-node',
        toNodeId: 'processing-node',
        messageSeq: 42,
        messageType: 'workflow-message'
      })
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        'message:queued',
        expect.objectContaining({
          event: 'message:queued',
          fromNodeId: 'input-node',
          toNodeId: 'processing-node',
          messageSeq: 42,
          messageType: 'workflow-message'
        })
      )
    })

    it('should emit message processed events with timing', () => {
      // Act
      eventContext.messageProcessed({
        fromNodeId: 'processing-node',
        toNodeId: 'output-node',
        messageSeq: 43,
        processingTime: 1200
      })
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        'message:processed',
        expect.objectContaining({
          event: 'message:processed',
          processingTime: 1200
        })
      )
    })
  })

  describe('Node Context Scoping', () => {
    it('should execute function within node context', async () => {
      // Arrange
      setSink(memorySink)
      let capturedContext: any = null
      
      // Act
      await obs.scope(baseContext, async () => {
        const result = await eventContext.withNodeContext('scoped-node-001', async () => {
          capturedContext = obs.getWorkflowContext()
          
          // Emit event within node context
          eventContext.nodeExecutionStarted({
            nodeId: 'scoped-node-001',
            nodeType: 'scoped-node',
            attempt: 1
          })
          
          return 'scoped-result'
        })
        
        expect(result).toBe('scoped-result')
      })
      
      // Assert
      expect(capturedContext).toMatchObject({
        wfId: 'test-workflow-123',
        invocationId: 'test-invocation-456',
        nodeId: 'scoped-node-001'
      })
      
      const events = memorySink.events
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        nodeId: 'scoped-node-001'
      })
    })

    it('should handle nested node contexts correctly', async () => {
      // Arrange
      setSink(memorySink)
      const contexts: any[] = []
      
      // Act
      await obs.scope(baseContext, async () => {
        await eventContext.withNodeContext('outer-node', async () => {
          contexts.push(obs.getWorkflowContext())
          
          await eventContext.withNodeContext('inner-node', async () => {
            contexts.push(obs.getWorkflowContext())
          })
          
          contexts.push(obs.getWorkflowContext())
        })
      })
      
      // Assert
      expect(contexts).toHaveLength(3)
      expect(contexts[0].nodeId).toBe('outer-node')
      expect(contexts[1].nodeId).toBe('inner-node')
      expect(contexts[2].nodeId).toBe('outer-node') // Restored after inner scope
    })

    it('should propagate errors from scoped operations', async () => {
      // Arrange
      const testError = new Error('Scoped operation failed')
      
      // Act & Assert
      await expect(
        eventContext.withNodeContext('error-node', async () => {
          throw testError
        })
      ).rejects.toThrow('Scoped operation failed')
    })

    it('should handle synchronous operations in node context', () => {
      // Act
      const result = eventContext.withNodeContext('sync-node', () => {
        const context = obs.getWorkflowContext()
        return context?.nodeId
      })
      
      // Assert
      expect(result).toBe('sync-node')
    })
  })

  describe('Event Timing and Measurement', () => {
    it('should measure operation timing correctly', async () => {
      // Arrange
      setSink(mockSink)
      const operationDelay = 100
      
      // Act
      await eventContext.withTiming('test-operation', 'timing-node', async () => {
        await new Promise(resolve => setTimeout(resolve, operationDelay))
      })
      
      // Assert
      const calls = (mockSink.event as any).mock.calls
      expect(calls).toHaveLength(1) // single completed event
      
      const completedEvent = calls[0][0]
      
      expect(completedEvent.event).toBe('test-operation:completed')
      expect(completedEvent.duration_ms).toBeGreaterThanOrEqual(operationDelay - 10)
      expect(completedEvent.duration_ms).toBeLessThan(operationDelay + 50)
    })

    it('should measure timing even when operation throws', async () => {
      // Arrange
      setSink(mockSink)
      
      // Act & Assert
      await expect(
        eventContext.withTiming('failing-operation', 'failing-node', async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
          throw new Error('Operation failed')
        })
      ).rejects.toThrow('Operation failed')
      
      // Assert timing events still emitted
      const calls = (mockSink.event as any).mock.calls
      expect(calls).toHaveLength(2)
      
      const endEvent = calls[1][2]
      expect(endEvent.event).toBe('timing:end')
      expect(endEvent.error).toBe('Operation failed')
    })
  })

  describe('Context Inheritance', () => {
    it('should inherit base context in all events', () => {
      // Arrange
      const customContext = ContextBuilder.create()
        .withWorkflowContext({
          wfId: 'custom-workflow',
          wfVersionId: 'v3.0.0',
          invocationId: 'custom-invocation'
        })
        .build()
      
      const customEventContext = new WorkflowEventContext(customContext)
      
      // Act
      customEventContext.nodeExecutionStarted({
        nodeId: 'inherit-test-node',
        nodeType: 'test-node',
        attempt: 1
      })
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        'node:execution:started',
        expect.objectContaining({
          wfId: 'custom-workflow',
          wfVersionId: 'v3.0.0',
          invocationId: 'custom-invocation',
          nodeId: 'inherit-test-node'
        })
      )
    })

    it('should allow event-specific overrides', () => {
      // Act
      eventContext.workflowStarted({
        nodeCount: 3,
        entryNodeId: 'override-entry',
        goal: 'Override test',
        // Override base context value
        wfId: 'overridden-workflow-id'
      } as any)
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        'workflow:started',
        expect.objectContaining({
          wfId: 'overridden-workflow-id', // Should use override
          invocationId: 'test-invocation-456' // Should keep base
        })
      )
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle rapid event emission efficiently', () => {
      // Arrange
      const eventCount = 1000
      
      // Act
      const startTime = performance.now()
      
      for (let i = 0; i < eventCount; i++) {
        eventContext.nodeExecutionStarted({
          nodeId: `rapid-node-${i}`,
          nodeType: 'rapid-node',
          attempt: 1
        })
      }
      
      const duration = performance.now() - startTime
      
      // Assert
      expect(mockSink.event).toHaveBeenCalledTimes(eventCount)
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })

    it('should handle missing optional fields gracefully', () => {
      // Act & Assert - Should not throw
      expect(() => {
        eventContext.nodeExecutionCompleted({
          nodeId: 'minimal-node',
          nodeType: 'minimal',
          duration: 1000,
          cost: 0.001,
          status: 'success'
          // Missing optional fields like tokenCount, retryCount, etc.
        })
      }).not.toThrow()
      
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        'node:execution:completed',
        expect.objectContaining({
          nodeId: 'minimal-node',
          status: 'success'
        })
      )
    })

    it('should handle context with missing fields', () => {
      // Arrange
      const minimalContext = { wfId: 'minimal-workflow' }
      const minimalEventContext = new WorkflowEventContext(minimalContext as any)
      
      // Act & Assert - Should not throw
      expect(() => {
        minimalEventContext.workflowStarted({
          nodeCount: 1,
          entryNodeId: 'minimal-entry',
          goal: 'Minimal test'
        })
      }).not.toThrow()
      
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        'workflow:started',
        expect.objectContaining({
          wfId: 'minimal-workflow',
          nodeCount: 1
        })
      )
    })

    it('should handle concurrent node context operations', async () => {
      // Arrange
      setSink(memorySink)
      const nodeIds = ['concurrent-1', 'concurrent-2', 'concurrent-3']
      
      // Act
      await obs.scope(baseContext, async () => {
        const promises = nodeIds.map(async (nodeId) => {
          return eventContext.withNodeContext(nodeId, async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
            
            eventContext.nodeExecutionStarted({
              nodeId,
              nodeType: 'concurrent-node',
              attempt: 1
            })
            
            return nodeId
          })
        })
        
        const results = await Promise.all(promises)
        expect(results).toEqual(nodeIds)
      })
      
      // Assert
      const events = memorySink.events
      expect(events).toHaveLength(3)
      
      const eventNodeIds = events.map(e => e.nodeId).sort()
      expect(eventNodeIds).toEqual(nodeIds.sort())
    })
  })
})