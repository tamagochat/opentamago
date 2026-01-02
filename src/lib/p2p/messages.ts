import { z } from "zod";

// Downloader → Uploader: Initial connection info
export const RequestInfoMessage = z.object({
  type: z.literal("RequestInfo"),
  browserName: z.string().optional(),
  osName: z.string().optional(),
});

// Uploader → Downloader: Password required
export const PasswordRequiredMessage = z.object({
  type: z.literal("PasswordRequired"),
  error: z.string().optional(),
});

// Downloader → Uploader: Submit password
export const UsePasswordMessage = z.object({
  type: z.literal("UsePassword"),
  password: z.string(),
});

// Uploader → Downloader: File metadata
export const InfoMessage = z.object({
  type: z.literal("Info"),
  file: z.object({
    name: z.string(),
    size: z.number(),
    type: z.string(),
  }),
});

// Downloader → Uploader: Start download
export const StartMessage = z.object({
  type: z.literal("Start"),
  offset: z.number().default(0),
});

// Uploader → Downloader: File chunk (binary data handled separately)
export const ChunkMessage = z.object({
  type: z.literal("Chunk"),
  offset: z.number(),
  final: z.boolean(),
});

// Downloader → Uploader: Acknowledge chunk
export const ChunkAckMessage = z.object({
  type: z.literal("ChunkAck"),
  bytesReceived: z.number(),
});

// Downloader → Uploader: Pause transfer
export const PauseMessage = z.object({
  type: z.literal("Pause"),
});

// Downloader → Uploader: Transfer complete
export const DoneMessage = z.object({
  type: z.literal("Done"),
});

// Either direction: Error
export const ErrorMessage = z.object({
  type: z.literal("Error"),
  message: z.string(),
});

// Union type for all messages (excluding binary chunk data)
export const Message = z.discriminatedUnion("type", [
  RequestInfoMessage,
  PasswordRequiredMessage,
  UsePasswordMessage,
  InfoMessage,
  StartMessage,
  ChunkMessage,
  ChunkAckMessage,
  PauseMessage,
  DoneMessage,
  ErrorMessage,
]);

export type RequestInfoMessage = z.infer<typeof RequestInfoMessage>;
export type PasswordRequiredMessage = z.infer<typeof PasswordRequiredMessage>;
export type UsePasswordMessage = z.infer<typeof UsePasswordMessage>;
export type InfoMessage = z.infer<typeof InfoMessage>;
export type StartMessage = z.infer<typeof StartMessage>;
export type ChunkMessage = z.infer<typeof ChunkMessage>;
export type ChunkAckMessage = z.infer<typeof ChunkAckMessage>;
export type PauseMessage = z.infer<typeof PauseMessage>;
export type DoneMessage = z.infer<typeof DoneMessage>;
export type ErrorMessage = z.infer<typeof ErrorMessage>;
export type Message = z.infer<typeof Message>;

export function decodeMessage(data: unknown): Message | null {
  try {
    return Message.parse(data);
  } catch {
    return null;
  }
}
