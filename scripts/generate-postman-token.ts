#!/usr/bin/env bun
/**
 * Quick script to generate a test bearer token for Postman testing
 * Usage: bun run scripts/generate-postman-token.ts
 */

import { nanoid } from "nanoid"
import { generateApiKey, hashSecret } from "../apps/web/src/lib/api-key-utils"
import { createStandaloneClient } from "../apps/web/src/lib/supabase/standalone"

async function generateTestToken() {
  console.log("\n🔑 Generating Test Bearer Token for Postman...\n")

  try {
    const supabase = createStandaloneClient(true) // Use service role
    const clerkId = `postman_test_${nanoid(10)}`

    const { keyId, secret, fullKey } = generateApiKey()
    const secretHash = hashSecret(secret)
    const secretId = `test_secret_${nanoid(10)}`

    const { error } = await supabase
      .schema("lockbox")
      .from("secret_keys")
      .insert([
        {
          secret_id: secretId,
          clerk_id: clerkId,
          key_id: keyId,
          secret_hash: secretHash,
          name: "Postman Test API Key",
          environment: "test",
          scopes: { all: true }, // Full access for testing
          created_by: clerkId,
          updated_by: clerkId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("❌ Error creating test token:", error.message)
      console.error("\n💡 Troubleshooting:")
      console.error("   1. Ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env")
      console.error("   2. Verify the service role key is valid")
      console.error("   3. Check if lockbox schema exists in your database")
      process.exit(1)
    }

    console.log("✅ Test Token Created Successfully!")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("\n📋 Postman Configuration:")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("\n🔑 Bearer Token:")
    console.log(`   ${fullKey}`)
    console.log("\n🆔 Key Details:")
    console.log(`   Key ID:    ${keyId}`)
    console.log(`   Secret ID: ${secretId}`)
    console.log(`   Clerk ID:  ${clerkId}`)
    console.log("   Scopes:    all (full access)")
    console.log("\n📝 How to use in Postman:")
    console.log("   1. Open your request in Postman")
    console.log("   2. Go to Authorization tab")
    console.log("   3. Select 'Bearer Token' as type")
    console.log(`   4. Paste token: ${fullKey}`)
    console.log("\n🌐 Test Endpoint:")
    console.log("   POST http://localhost:3000/api/v1/invoke")
    console.log("\n📦 Example Request Body:")
    console.log(`   {
     "jsonrpc": "2.0",
     "id": "test_001",
     "method": "workflow.invoke",
     "params": {
       "workflow_id": "YOUR_WORKFLOW_ID",
       "input": "Test message"
     }
   }`)
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
  } catch (error) {
    console.error("\n❌ Unexpected error:", error)
    process.exit(1)
  }
}

generateTestToken()
