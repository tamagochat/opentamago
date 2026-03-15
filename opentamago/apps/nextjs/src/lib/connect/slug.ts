import { CONNECT_CONFIG, CONNECT_SLUG_WORDS } from "./constants";

export function generateShortSlug(): string {
  const { SHORT_SLUG_LENGTH, SHORT_SLUG_CHARS } = CONNECT_CONFIG;
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

  for (let i = 0; i < CONNECT_CONFIG.LONG_SLUG_WORDS; i++) {
    let index: number;
    do {
      index = Math.floor(Math.random() * CONNECT_SLUG_WORDS.length);
    } while (usedIndices.has(index));

    usedIndices.add(index);
    words.push(CONNECT_SLUG_WORDS[index]!);
  }

  return words.join("-");
}

