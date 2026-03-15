/**
 * P2P Challenge-Response Authentication
 *
 * Uses SHA-256 to hash password + challenge for secure password verification
 * without transmitting plaintext passwords over the P2P channel.
 */

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
export async function computeChallengeResponse(
  password: string,
  challenge: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + challenge);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
