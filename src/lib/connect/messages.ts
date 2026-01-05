import { z } from "zod";

// Participant status (like P2P's ConnectionStatus)
export type ParticipantStatus =
  | "connecting"    // Peer connection being established
  | "pending"       // Connected but hasn't selected character
  | "ready"         // Character selected and synced
  | "disconnected"; // Connection lost

// Full character data (local use only, not shared with others)
export const CharacterDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  personality: z.string(),
  scenario: z.string(),
  firstMessage: z.string(),
  exampleDialogue: z.string(),
  systemPrompt: z.string(),
  avatar: z.string().optional(), // Base64
});

export type CharacterData = z.infer<typeof CharacterDataSchema>;

// Minimal character info (shared with other participants - name and avatar only)
export const CharacterInfoSchema = z.object({
  name: z.string(),
  avatar: z.string().optional(), // Base64
});

export type CharacterInfo = z.infer<typeof CharacterInfoSchema>;

// Character sync message (shares only name and avatar, not full character details)
export const CharacterSyncMessage = z.object({
  type: z.literal("CharacterSync"),
  character: CharacterInfoSchema,
  peerId: z.string(),
});

// Chat message
export const ChatMessage = z.object({
  type: z.literal("ChatMessage"),
  id: z.string(), // UUID for deduplication
  senderId: z.string(), // Peer ID
  characterName: z.string(),
  content: z.string(),
  isHuman: z.boolean(), // true if human typed, false if AI generated
  timestamp: z.number(),
});

export type ChatMessageType = z.infer<typeof ChatMessage>;

// Typing indicator (human typing)
export const TypingMessage = z.object({
  type: z.literal("Typing"),
  peerId: z.string(),
  characterName: z.string(),
  isTyping: z.boolean(),
});

// Thinking indicator (AI generating)
export const ThinkingMessage = z.object({
  type: z.literal("Thinking"),
  peerId: z.string(),
  characterName: z.string(),
  isThinking: z.boolean(),
});

// AI turn coordination (to prevent duplicate AI calls)
export const AITurnMessage = z.object({
  type: z.literal("AITurn"),
  responderId: z.string(), // Who should respond
  inResponseTo: z.string(), // Message ID
});

// Peer state update
export const PeerStateMessage = z.object({
  type: z.literal("PeerState"),
  peerId: z.string(),
  autoReplyEnabled: z.boolean(),
});

// Heartbeat (guest → host to indicate they're alive)
export const HeartbeatMessage = z.object({
  type: z.literal("Heartbeat"),
  peerId: z.string(),
  timestamp: z.number(),
});

// Peer connecting (joined link but hasn't selected character)
export const PeerConnectingMessage = z.object({
  type: z.literal("PeerConnecting"),
  peerId: z.string(),
});

// Peer joined (selected character and ready)
export const PeerJoinedMessage = z.object({
  type: z.literal("PeerJoined"),
  peerId: z.string(),
  characterName: z.string(),
  characterAvatar: z.string().optional(),
});

// Peer left
export const PeerLeftMessage = z.object({
  type: z.literal("PeerLeft"),
  peerId: z.string(),
  characterName: z.string().optional(), // Include character name for leave message
});

// System message (join/leave notifications)
export const SystemMessage = z.object({
  type: z.literal("SystemMessage"),
  id: z.string(), // UUID for deduplication
  event: z.enum(["joined", "left"]),
  characterName: z.string(),
  timestamp: z.number(),
});

export type SystemMessageType = z.infer<typeof SystemMessage>;

// Participant list broadcast (host → all peers when new participant joins)
export const ParticipantListMessage = z.object({
  type: z.literal("ParticipantList"),
  participants: z.array(
    z.object({
      peerId: z.string(),
      character: CharacterInfoSchema,
      autoReplyEnabled: z.boolean(),
    })
  ),
});

// Request sync (when joining)
export const RequestSyncMessage = z.object({
  type: z.literal("RequestSync"),
  peerId: z.string(),
});

// Session info (host → joiner)
export const SessionInfoMessage = z.object({
  type: z.literal("SessionInfo"),
  participants: z.array(
    z.object({
      peerId: z.string(),
      character: CharacterInfoSchema,
      autoReplyEnabled: z.boolean(),
    })
  ),
  chatHistory: z.array(ChatMessage.omit({ type: true })),
});

// Union type for all messages
export const ConnectMessage = z.discriminatedUnion("type", [
  CharacterSyncMessage,
  ChatMessage,
  TypingMessage,
  ThinkingMessage,
  AITurnMessage,
  PeerStateMessage,
  HeartbeatMessage,
  PeerConnectingMessage,
  PeerJoinedMessage,
  PeerLeftMessage,
  SystemMessage,
  ParticipantListMessage,
  RequestSyncMessage,
  SessionInfoMessage,
]);

export type ConnectMessageType = z.infer<typeof ConnectMessage>;
