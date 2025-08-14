/**
 * Simple verification that Zustand persistence works
 * Run this in browser console to verify data is saved
 */

export function verifyPersistence() {
  const key = 'run-config/v1'
  const stored = localStorage.getItem(key)
  
  if (!stored) {
    return { 
      persisted: false, 
      message: 'No data found. Add some test cases first.' 
    }
  }
  
  const data = JSON.parse(stored)
  const state = data.state
  
  return {
    persisted: true,
    datasetName: state.datasetName || '(unnamed)',
    testCases: state.cases?.length || 0,
    savedResults: Object.keys(state.resultsById || {}).length,
    storageSize: (stored.length / 1024).toFixed(2) + ' KB',
    exampleResult: Object.values(state.resultsById || {})[0] || null
  }
}

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).verifyPersistence = verifyPersistence
}