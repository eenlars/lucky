export interface EnvironmentKey {
  id: string
  name: string
  value: string
  isVisible: boolean
}

const STORAGE_KEY = "environment-keys"

export class EnvironmentKeysManager {
  // Prefer a robust UUID when available; fall back in SSR/tests
  private static newId(): string {
    const g: any = globalThis as any
    if (typeof g.crypto !== "undefined" && g.crypto !== null && typeof g.crypto.randomUUID === "function") {
      return g.crypto.randomUUID()
    }
    // RFC4122-ish v4 fallback
    const rnd = (len = 16) => Array.from({ length: len }, () => Math.floor(Math.random() * 256))
    const bytes = Uint8Array.from(rnd())
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"))
    return (
      hex.slice(0, 4).join("") +
      "-" +
      hex.slice(4, 6).join("") +
      "-" +
      hex.slice(6, 8).join("") +
      "-" +
      hex.slice(8, 10).join("") +
      "-" +
      hex.slice(10, 16).join("")
    )
  }

  static getKeys(): EnvironmentKey[] {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Failed to load environment keys:", error)
      return []
    }
  }

  static saveKeys(keys: EnvironmentKey[]): void {
    if (typeof window === "undefined") return

    try {
      // Note: Keys are stored in localStorage in plaintext. Be mindful of XSS risks.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
    } catch (error) {
      console.error("Failed to save environment keys:", error)
      throw error
    }
  }

  static getKeyValue(name: string): string | undefined {
    const keys = this.getKeys()
    const trimmed = name.trim()
    const key = keys.find((k) => k.name === trimmed)
    return key?.value
  }

  static getAllKeysAsEnv(): Record<string, string> {
    const keys = this.getKeys()
    const env: Record<string, string> = {}

    keys.forEach((key) => {
      if (key.name && key.value) {
        env[key.name] = key.value
      }
    })

    return env
  }

  static validateKeyName(name: string): string | null {
    if (!name.trim()) {
      return "Key name is required"
    }

    // Allow ENV-style names: start with uppercase letter or underscore, then A-Z/0-9/_
    if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
      return "Key name must start with an uppercase letter or underscore and contain only A-Z, 0-9, and underscores"
    }

    return null
  }

  static createKey(name: string, value: string): EnvironmentKey {
    return {
      id: this.newId(),
      name: name.trim(),
      value: value.trim(),
      isVisible: false,
    }
  }
}
