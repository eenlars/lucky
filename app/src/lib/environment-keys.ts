export interface EnvironmentKey {
  id: string
  name: string
  value: string
  isVisible: boolean
}

const STORAGE_KEY = "environment-keys"

export class EnvironmentKeysManager {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
    } catch (error) {
      console.error("Failed to save environment keys:", error)
      throw error
    }
  }

  static getKeyValue(name: string): string | undefined {
    const keys = this.getKeys()
    const key = keys.find(k => k.name === name)
    return key?.value
  }

  static getAllKeysAsEnv(): Record<string, string> {
    const keys = this.getKeys()
    const env: Record<string, string> = {}
    
    keys.forEach(key => {
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
      id: crypto.randomUUID(),
      name: name.trim(),
      value: value.trim(),
      isVisible: false,
    }
  }
}
