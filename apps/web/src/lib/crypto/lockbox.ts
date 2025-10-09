/**
 * Lockbox crypto utilities - re-export from shared package.
 * This file maintains backward compatibility for existing imports.
 */

export { encryptGCM, decryptGCM, normalizeNamespace, type SecretLocator } from "@lucky/shared/crypto/lockbox"
