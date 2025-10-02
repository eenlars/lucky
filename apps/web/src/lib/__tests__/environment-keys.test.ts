import { beforeEach, describe, expect, it } from "vitest"
import { type EnvironmentKey, EnvironmentKeysManager } from "../environment-keys"

// Minimal in-memory localStorage stub
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  setItem(key: string, value: string) {
    this.store.set(key, value)
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  clear() {
    this.store.clear()
  }
}

describe("EnvironmentKeysManager", () => {
  beforeEach(() => {
    // @ts-expect-error test environment mutation
    globalThis.localStorage = new MemoryStorage()
    // @ts-expect-error test environment mutation
    globalThis.window = {}
  })

  it("validates key names correctly", () => {
    expect(EnvironmentKeysManager.validateKeyName("")).toBeTruthy()
    expect(EnvironmentKeysManager.validateKeyName("OPENAI_API_KEY")).toBeNull()
    expect(EnvironmentKeysManager.validateKeyName("_SECRET")).toBeNull()
    expect(EnvironmentKeysManager.validateKeyName("lowercase")).toBeTruthy()
    expect(EnvironmentKeysManager.validateKeyName("INVALID-NAME")).toBeTruthy()
  })

  it("saves and loads keys from storage", () => {
    const keys: EnvironmentKey[] = [
      { id: "1", name: "FOO", value: "BAR", isVisible: false },
      { id: "2", name: "_HIDDEN", value: "1", isVisible: false },
    ]
    EnvironmentKeysManager.saveKeys(keys)
    const loaded = EnvironmentKeysManager.getKeys()
    expect(loaded).toEqual(keys)
  })

  it("produces env map of non-empty pairs", () => {
    const keys: EnvironmentKey[] = [
      { id: "1", name: "FOO", value: "BAR", isVisible: false },
      { id: "2", name: "EMPTY", value: "", isVisible: false },
      { id: "3", name: "", value: "VAL", isVisible: false },
    ]
    EnvironmentKeysManager.saveKeys(keys)
    const env = EnvironmentKeysManager.getAllKeysAsEnv()
    expect(env).toEqual({ FOO: "BAR" })
  })
})
