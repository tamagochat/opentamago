import { P2P_CONFIG, LONG_SLUG_WORDS, CONNECT_CONFIG, CONNECT_SLUG_WORDS } from "./constants";

// P2P Share slug generation
export function generateShareShortSlug(): string {
  const { SHORT_SLUG_LENGTH, SHORT_SLUG_CHARS } = P2P_CONFIG;
  let result = "";
  for (let i = 0; i < SHORT_SLUG_LENGTH; i++) {
    result += SHORT_SLUG_CHARS.charAt(
      Math.floor(Math.random() * SHORT_SLUG_CHARS.length)
    );
  }
  return result;
}

export function generateShareLongSlug(): string {
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

// Connect slug generation
export function generateConnectShortSlug(): string {
  const { SHORT_SLUG_LENGTH, SHORT_SLUG_CHARS } = CONNECT_CONFIG;
  let result = "";
  for (let i = 0; i < SHORT_SLUG_LENGTH; i++) {
    result += SHORT_SLUG_CHARS.charAt(
      Math.floor(Math.random() * SHORT_SLUG_CHARS.length)
    );
  }
  return result;
}

export function generateConnectLongSlug(): string {
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
