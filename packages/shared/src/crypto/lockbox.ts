import crypto from "node:crypto"

/**
 * Lockbox crypto utilities using AES-256-GCM.
 * Shared between web app and core package for consistent encryption/decryption.
 *
 * KEK handling:
 * - Reads `LOCKBOX_KEK` from process.env
 * - Accepts 32-byte raw, hex, or base64 strings
 * - If other length, derives a 32-byte key via SHA-256 of the input
 */

function normalizeKeyBytes(raw: string): Buffer {
  // Try hex
  try {
    if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
      const b = Buffer.from(raw, "hex")
      if (b.length > 0) return b
    }
  } catch {}

  // Try base64
  try {
    if (/^[0-9a-zA-Z+/=]+$/.test(raw)) {
      const b = Buffer.from(raw, "base64")
      if (b.length > 0) return b
    }
  } catch {}

  // Fallback: treat as UTF-8
  return Buffer.from(raw, "utf8")
}

function getKEK(): Buffer {
  const raw = process.env.LOCKBOX_KEK
  if (!raw) throw new Error("LOCKBOX_KEK is not set. Set a 32-byte key (hex/base64/utf8).")
  const bytes = normalizeKeyBytes(raw)
  // Ensure 32 bytes (AES-256)
  return bytes.length === 32 ? bytes : crypto.createHash("sha256").update(bytes).digest()
}

export function encryptGCM(plaintext: string): { ciphertext: Uint8Array; iv: Uint8Array; authTag: Uint8Array } {
  const key = getKEK()
  const iv = crypto.randomBytes(12) // 96-bit nonce for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return { ciphertext: new Uint8Array(enc), iv: new Uint8Array(iv), authTag: new Uint8Array(tag) }
}

export function decryptGCM(params: {
  ciphertext: ArrayBuffer | Uint8Array
  iv: ArrayBuffer | Uint8Array
  authTag: ArrayBuffer | Uint8Array
}): string {
  const key = getKEK()
  const iv = Buffer.from(params.iv as Uint8Array)
  const tag = Buffer.from(params.authTag as Uint8Array)
  const data = Buffer.from(params.ciphertext as Uint8Array)
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString("utf8")
}

export type SecretLocator = {
  namespace?: string
  name: string
}

export function normalizeNamespace(ns?: string | null): string {
  return (ns ?? "default").trim() || "default"
}
