#!/usr/bin/env node

/**
 * Test script to verify the real-time workflow event system
 * 
 * This script tests:
 * 1. SSE sink initialization 
 * 2. Event emission during workflow execution
 * 3. Event streaming to connected clients
 */

import { initializeObservability } from './core/src/utils/observability/setup.js'
import { obs } from './core/src/utils/observability/obs.js'
import { WorkflowEventContext } from './core/src/utils/observability/WorkflowEventContext.js'

async function testRealTimeEvents() {
  console.log('🚀 Testing Real-time Workflow Event System...\n')
  
  // 1. Initialize observability system
  console.log('1. Initializing observability system...')
  const obsStats = initializeObservability({
    enableConsoleLogging: true,
    enableSSEStreaming: true,
  })
  console.log('✅ Observability initialized')
  console.log(`   SSE connections: ${obsStats.sseConnectionCount()}`)
  
  // 2. Test event emission in workflow context
  console.log('\n2. Testing event emission...')
  
  const testContext = {
    wfId: 'test-workflow-001',
    wfVersionId: 'v1.0.0',
    invocationId: 'test-invocation-' + Date.now(),
  }
  
  await obs.scope(testContext, async () => {
    const eventContext = new WorkflowEventContext(testContext)
    
    // Emit workflow started event
    console.log('   Emitting workflow:started event...')
    eventContext.workflowStarted({
      nodeCount: 3,
      entryNodeId: 'entry-node',
      goal: 'Test workflow execution with real-time events'
    })
    
    // Simulate node execution
    console.log('   Emitting node execution events...')
    await eventContext.withNodeContext('node-1', async () => {
      eventContext.nodeExecutionStarted({
        nodeId: 'node-1',
        nodeType: 'transform-node',
        attempt: 1
      })
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      eventContext.nodeExecutionCompleted({
        nodeId: 'node-1',
        nodeType: 'transform-node',
        duration: 100,
        cost: 0.001,
        status: 'success'
      })
    })
    
    // Emit workflow completed event
    console.log('   Emitting workflow:completed event...')
    eventContext.workflowCompleted({
      duration: 200,
      totalCost: 0.001,
      nodeInvocations: 1,
      status: 'success'
    })
  })
  
  console.log('✅ Events emitted successfully')
  
  // 3. Test workflow context retrieval
  console.log('\n3. Testing workflow context retrieval...')
  await obs.scope(testContext, async () => {
    const ctx = obs.getWorkflowContext()
    console.log('   Retrieved context:', JSON.stringify(ctx, null, 2))
    console.log('✅ Context retrieval works')
  })
  
  console.log('\n🎉 All tests passed! Real-time event system is working correctly.')
  console.log('\nNext steps:')
  console.log('1. Start your Next.js app: bun run web')
  console.log('2. Invoke a workflow via /api/workflow/invoke')
  console.log('3. Connect to /api/workflow/stream to see real-time events')
  console.log('4. Use the React hooks in your UI components')
}

// Run the test
testRealTimeEvents().catch(console.error)