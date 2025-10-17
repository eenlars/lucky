import crypto from "node:crypto"

export function generateApiKey(): { keyId: string; secret: string; fullKey: string } {
  // Generate a random secret (32 bytes = 256 bits)
  const secretBytes = crypto.randomBytes(32)
  const secret = secretBytes.toString("base64url").replace(/[-]/g, "")

  // Create a shorter key_id for display (first 8 chars of the secret hash)
  const keyIdHash = crypto
    .createHash("sha256")
    .update(secretBytes)
    .digest("base64url")
    .replace(/[-]/g, "")
    .substring(0, 8)
  const keyId = `alive_${keyIdHash}`

  // Full key is prefix + secret
  const fullKey = `alive_${secret}`

  return { keyId, secret, fullKey }
}

export function hashSecret(secret: string): string {
  // Use SHA-256 to hash the secret for storage
  return crypto.createHash("sha256").update(secret).digest("hex")
}
