#!/usr/bin/env bun

/**
 * Test Redis connectivity with provided credentials
 */

import Redis from "ioredis"

async function testRedis() {
  console.log("Testing Redis connection...")

  const host = process.env.REDIS_HOST
  const port = Number.parseInt(process.env.REDIS_PORT || "6379", 10)
  const password = process.env.REDIS_PASSWORD

  if (!host) {
    console.error("❌ REDIS_HOST not set in environment")
    process.exit(1)
  }

  if (!password) {
    console.error("❌ REDIS_PASSWORD not set in environment")
    process.exit(1)
  }

  console.log(`Connecting to Redis at ${host}:${port}...`)

  const client = new Redis({
    host,
    port,
    password,
    retryStrategy(times: number) {
      if (times > 3) {
        return null // Stop retrying
      }
      return Math.min(times * 100, 3000)
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    commandTimeout: 5000,
  })

  try {
    // Test 1: Ping
    console.log("Test 1: PING")
    const pong = await client.ping()
    console.log(`✓ PING response: ${pong}`)

    // Test 2: Set and Get
    console.log("\nTest 2: SET/GET")
    const testKey = `test:${Date.now()}`
    await client.set(testKey, "hello from lucky", "EX", 60)
    console.log(`✓ SET ${testKey}`)

    const value = await client.get(testKey)
    console.log(`✓ GET ${testKey} = ${value}`)

    // Test 3: Hash operations (what we use for workflow state)
    console.log("\nTest 3: HSET/HGETALL")
    const hashKey = `test:hash:${Date.now()}`
    await client.hset(hashKey, {
      state: "running",
      createdAt: String(Date.now()),
    })
    console.log(`✓ HSET ${hashKey}`)

    const hash = await client.hgetall(hashKey)
    console.log(`✓ HGETALL ${hashKey}:`, hash)

    // Test 4: Pub/Sub
    console.log("\nTest 4: Pub/Sub")
    const subscriber = client.duplicate()
    const channel = `test:channel:${Date.now()}`

    await subscriber.subscribe(channel)
    console.log(`✓ Subscribed to ${channel}`)

    // Set up message handler
    const messagePromise = new Promise<void>(resolve => {
      subscriber.on("message", (ch: string, msg: string) => {
        if (ch === channel && msg === "test") {
          console.log(`✓ Received message: ${msg}`)
          resolve()
        }
      })
    })

    // Publish message
    const subscribers = await client.publish(channel, "test")
    console.log(`✓ Published to ${subscribers} subscriber(s)`)

    // Wait for message
    await messagePromise

    // Cleanup
    await subscriber.unsubscribe(channel)
    await subscriber.quit()
    console.log("✓ Unsubscribed and closed subscriber")

    // Cleanup test keys
    await client.del(testKey, hashKey)

    await client.quit()

    console.log("\n✅ All Redis tests passed!")
    process.exit(0)
  } catch (error) {
    console.error("\n❌ Redis test failed:")
    console.error(error)
    await client.quit()
    process.exit(1)
  }
}

testRedis()
