export const P2P_CONFIG = {
  // Transfer settings
  MAX_CHUNK_SIZE: 256 * 1024, // 256 KB per chunk (same as FilePizza)
  CHANNEL_TTL: 60 * 60, // 1 hour in seconds
  RENEWAL_INTERVAL: 60 * 1000, // Renew every 60 seconds

  // Slug generation
  SHORT_SLUG_LENGTH: 8,
  SHORT_SLUG_CHARS: "0123456789abcdefghijklmnopqrstuvwxyz",
  LONG_SLUG_WORDS: 4,
  MAX_SLUG_ATTEMPTS: 8,

  // Limits
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2 GB

  // Timeouts
  CONNECTION_TIMEOUT: 30 * 1000, // 30 seconds
  STALL_TIMEOUT: 60 * 1000, // 60 seconds stall timeout during transfer
} as const;

// Character-themed words for long slugs (inspired by AI characters)
export const LONG_SLUG_WORDS = [
  "angel",
  "brave",
  "charm",
  "dream",
  "ember",
  "frost",
  "grace",
  "heart",
  "ivory",
  "jewel",
  "karma",
  "lunar",
  "magic",
  "noble",
  "ocean",
  "pearl",
  "quest",
  "raven",
  "solar",
  "tiger",
  "unity",
  "velvet",
  "whisper",
  "xenon",
  "youth",
  "zephyr",
  "aura",
  "blaze",
  "crystal",
  "divine",
  "echo",
  "flame",
  "glimmer",
  "haven",
  "iris",
  "jade",
  "knight",
  "lotus",
  "mist",
  "nova",
  "opal",
  "prism",
  "quartz",
  "rose",
  "spark",
  "twilight",
  "umbra",
  "violet",
  "wonder",
  "zenith",
] as const;
