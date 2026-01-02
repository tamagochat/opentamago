import { P2P_CONFIG, LONG_SLUG_WORDS } from "./constants";

export function generateShortSlug(): string {
  const { SHORT_SLUG_LENGTH, SHORT_SLUG_CHARS } = P2P_CONFIG;
  let result = "";
  for (let i = 0; i < SHORT_SLUG_LENGTH; i++) {
    result += SHORT_SLUG_CHARS.charAt(
      Math.floor(Math.random() * SHORT_SLUG_CHARS.length)
    );
  }
  return result;
}

export function generateLongSlug(): string {
  const words: string[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < P2P_CONFIG.LONG_SLUG_WORDS; i++) {
    let index: number;
    do {
      index = Math.floor(Math.random() * LONG_SLUG_WORDS.length);
    } while (usedIndices.has(index));

    usedIndices.add(index);
    words.push(LONG_SLUG_WORDS[index]!);
  }

  return words.join("/");
}

export function isShortSlug(slug: string): boolean {
  if (slug.length !== P2P_CONFIG.SHORT_SLUG_LENGTH) return false;
  return [...slug].every((char) => P2P_CONFIG.SHORT_SLUG_CHARS.includes(char));
}

export function isLongSlug(slug: string): boolean {
  const parts = slug.split("/");
  if (parts.length !== P2P_CONFIG.LONG_SLUG_WORDS) return false;
  return parts.every((word) =>
    (LONG_SLUG_WORDS as readonly string[]).includes(word)
  );
}
