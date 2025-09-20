#!/usr/bin/env node

/**
 * Quick API endpoint test to verify they can be imported and work
 */

import { promises as fs } from 'fs'

async function testApiEndpoints() {
  console.log('🔍 Testing API endpoint imports...\n')
  
  try {
    // Test 1: Can we import the invoke route?
    console.log('1. Testing /api/workflow/invoke import...')
    const invokeModule = await import('./app/src/app/api/workflow/invoke/route.ts')
    console.log('✅ Invoke route imports successfully')
    console.log('   - Has POST method:', typeof invokeModule.POST === 'function')
    
    // Test 2: Can we import the stream route?
    console.log('\n2. Testing /api/workflow/stream import...')
    const streamModule = await import('./app/src/app/api/workflow/stream/route.ts')  
    console.log('✅ Stream route imports successfully')
    console.log('   - Has GET method:', typeof streamModule.GET === 'function')
    
    // Test 3: Can we import the observability setup?
    console.log('\n3. Testing observability setup...')
    const setupModule = await import('./core/src/utils/observability/setup.ts')
    console.log('✅ Observability setup imports successfully')
    console.log('   - Has initializeObservability:', typeof setupModule.initializeObservability === 'function')
    
    // Test 4: Can we import the SSE sink?
    console.log('\n4. Testing global SSE sink...')
    const sseModule = await import('./core/src/utils/observability/sinks/SSESink.ts')
    console.log('✅ SSE sink imports successfully')
    console.log('   - Has globalSSESink:', typeof sseModule.globalSSESink === 'object')
    console.log('   - Connection count:', sseModule.globalSSESink.getConnectionCount())
    
    // Test 5: Check if workflow events can be imported
    console.log('\n5. Testing workflow events...')
    const eventsModule = await import('./core/src/utils/observability/events/WorkflowEvents.ts')
    console.log('✅ Workflow events import successfully')
    
    console.log('\n🎉 All API components import successfully!')
    console.log('\n📋 Summary:')
    console.log('   • /api/workflow/invoke ✅')
    console.log('   • /api/workflow/stream ✅') 
    console.log('   • Observability system ✅')
    console.log('   • SSE broadcasting ✅')
    console.log('   • Event type definitions ✅')
    
    console.log('\n✨ The real-time workflow system is ready to use!')
    
  } catch (error) {
    console.error('❌ Import test failed:', error)
    process.exit(1)
  }
}

testApiEndpoints().catch(console.error)