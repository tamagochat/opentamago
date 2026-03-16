/**
 * P2P Challenge-Response Authentication
 *
 * Uses @noble/hashes for cross-platform SHA-256 (Next.js, Expo iOS/Android).
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * Generate a random challenge string for password verification.
 * Uses crypto.randomUUID() for sufficient entropy.
 */
export function generateChallenge(): string {
  return crypto.randomUUID();
}

/**
 * Compute SHA-256 hash of password + challenge.
 * Used by both uploader (to verify) and downloader (to respond).
 */
export function computeChallengeResponse(
  password: string,
  challenge: string,
): string {
  return bytesToHex(sha256(new TextEncoder().encode(password + challenge)));
}
