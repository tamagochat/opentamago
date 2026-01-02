export const CONNECT_CONFIG = {
  // Session settings
  SESSION_TTL: 4 * 60 * 60, // 4 hours in seconds
  HEARTBEAT_INTERVAL: 60 * 1000, // 60 seconds
  MAX_PARTICIPANTS: 8,

  // Auto-reply settings
  DEFAULT_AUTO_REPLY_DELAY: 5000, // 5 seconds
  MIN_AUTO_REPLY_DELAY: 1000, // 1 second
  MAX_AUTO_REPLY_DELAY: 30000, // 30 seconds

  // Slug generation (reuse P2P settings)
  SHORT_SLUG_LENGTH: 6,
  SHORT_SLUG_CHARS: "0123456789abcdefghijklmnopqrstuvwxyz",
  LONG_SLUG_WORDS: 4,
  MAX_SLUG_ATTEMPTS: 8,

  // Character generation
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10 MB
  SUPPORTED_IMAGE_TYPES: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ] as const,

  // WebRTC
  CONNECTION_TIMEOUT: 30 * 1000, // 30 seconds
  RECONNECT_ATTEMPTS: 3,
} as const;

// Character-themed words for long slugs
export const CONNECT_SLUG_WORDS = [
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
  "zenith",
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
  "spirit",
] as const;
