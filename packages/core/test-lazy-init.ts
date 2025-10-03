// temporary test file for lazy initialization
import { getSupabase, hasSupabase, resetSupabaseClient } from "./src/utils/clients/supabase/client"

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("testing lazy supabase client initialization")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

// test 1: hasSupabase() returns false without credentials
console.log("test 1: hasSupabase() with no credentials")
resetSupabaseClient()
process.env.SUPABASE_PROJECT_ID = undefined
process.env.SUPABASE_ANON_KEY = undefined
const hasClient = hasSupabase()
console.log(`  result: ${hasClient}`)
console.log(hasClient === false ? "  ✓ passed" : "  ✗ failed")

// test 2: getSupabase() throws clear error
console.log("\ntest 2: getSupabase() throws with no credentials")
resetSupabaseClient()
try {
  getSupabase()
  console.log("  ✗ failed - should have thrown")
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.log(`  error message: ${message.split("\n")[0]}`)
  console.log(message.includes("supabase project id not found") ? "  ✓ passed" : "  ✗ failed")
}

// test 3: cached error is thrown on subsequent calls
console.log("\ntest 3: cached error on second call")
try {
  getSupabase()
  console.log("  ✗ failed - should have thrown cached error")
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.log(`  error message: ${message.split("\n")[0]}`)
  console.log(message.includes("supabase project id not found") ? "  ✓ passed" : "  ✗ failed")
}

// test 4: reset clears cached error
console.log("\ntest 4: resetSupabaseClient() clears cache")
resetSupabaseClient()
try {
  getSupabase()
  console.log("  ✗ failed - should have thrown fresh error")
} catch (_error) {
  console.log("  ✓ passed - threw fresh error after reset")
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("all lazy initialization tests completed")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
