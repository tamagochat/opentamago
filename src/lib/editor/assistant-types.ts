import { z } from "zod";

// Character form schema
export const characterFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  personality: z.string(),
  scenario: z.string(),
  firstMessage: z.string(),
  exampleDialogue: z.string(),
  systemPrompt: z.string(),
  postHistoryInstructions: z.string(),
  alternateGreetings: z.array(z.string()),
  groupOnlyGreetings: z.array(z.string()),
  creatorNotes: z.string(),
  tags: z.array(z.string()),
  creator: z.string(),
  characterVersion: z.string(),
  nickname: z.string(),
  avatarData: z.string().optional(),
});

export type CharacterFormData = z.infer<typeof characterFormSchema>;

// Lorebook entry form schema
export const lorebookEntryFormSchema = z.object({
  id: z.string().optional(), // Temporary ID for new entries
  keys: z.array(z.string()).min(1, "At least one key required"),
  content: z.string().min(1, "Content is required"),
  enabled: z.boolean().default(true),
  priority: z.number().default(10),
  position: z.string().default("before_char"),
  insertionOrder: z.number().default(100),
  caseSensitive: z.boolean().default(false),
  selective: z.boolean().default(false),
  secondaryKeys: z.array(z.string()).default([]),
  constant: z.boolean().default(false),
  useRegex: z.boolean().default(false),
  name: z.string().optional(),
  comment: z.string().optional(),
});

export type LorebookEntryFormData = z.infer<typeof lorebookEntryFormSchema>;

// Asset form data
export type AssetType = "icon" | "emotion" | "background" | "other";

export interface AssetFormData {
  id: string; // Temporary ID
  assetType: AssetType;
  name: string;
  ext: string;
  data: Uint8Array;
  dataUrl?: string; // For display
}

// Assistant message types
export type AssistantMessageRole = "user" | "assistant" | "system";

export interface AssistantMessage {
  id: string;
  role: AssistantMessageRole;
  content: string;
  timestamp: number;
  imageData?: Uint8Array;
  imageDataUrl?: string;
  suggestedAssetType?: AssetType;
}

// Character field names for copy-to-field action
export type CharacterField =
  | "description"
  | "personality"
  | "scenario"
  | "firstMessage"
  | "exampleDialogue"
  | "systemPrompt"
  | "postHistoryInstructions"
  | "creatorNotes";

// Action context for follow-up buttons
export interface ActionContext {
  hasText: boolean;
  hasImage: boolean;
  hasLorebookFormat: boolean;
  suggestedFields: CharacterField[];
}

// Analyze content to determine appropriate actions
export function analyzeContent(content: string): ActionContext {
  const lorebookPattern = /Keys?:\s*\[.+\].*Content:/i;
  const hasLorebookFormat = lorebookPattern.test(content);

  // Detect suggested fields based on content patterns
  const suggestedFields: CharacterField[] = [];

  const lowerContent = content.toLowerCase();

  if (
    lowerContent.includes("personality") ||
    lowerContent.includes("traits") ||
    lowerContent.includes("quirks")
  ) {
    suggestedFields.push("personality");
  }
  if (
    lowerContent.includes("background") ||
    lowerContent.includes("backstory") ||
    lowerContent.includes("history")
  ) {
    suggestedFields.push("description");
  }
  if (content.match(/["*].*["*]/)) {
    // Contains dialogue
    suggestedFields.push("firstMessage", "exampleDialogue");
  }
  if (
    lowerContent.includes("scenario") ||
    lowerContent.includes("setting") ||
    lowerContent.includes("context")
  ) {
    suggestedFields.push("scenario");
  }
  if (
    lowerContent.includes("system prompt") ||
    lowerContent.includes("instruction")
  ) {
    suggestedFields.push("systemPrompt");
  }

  return {
    hasText: content.length > 0,
    hasImage: false, // Will be set separately for image messages
    hasLorebookFormat,
    suggestedFields:
      suggestedFields.length > 0 ? suggestedFields : ["description"],
  };
}

// Parse lorebook format from AI response
export function parseLorebookFormat(content: string): {
  keys: string[];
  content: string;
} | null {
  // Pattern: Keys: [key1, key2] | Content: [lore content]
  const match = content.match(
    /Keys?:\s*\[([^\]]+)\]\s*\|?\s*Content:\s*(.+)/is
  );
  if (!match || !match[1] || !match[2]) return null;

  const keys = match[1]
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const loreContent = match[2].trim();

  return { keys, content: loreContent };
}

// Default values for new character form
export const defaultCharacterForm: CharacterFormData = {
  name: "",
  description: "",
  personality: "",
  scenario: "",
  firstMessage: "",
  exampleDialogue: "",
  systemPrompt: "",
  postHistoryInstructions: "",
  alternateGreetings: [],
  groupOnlyGreetings: [],
  creatorNotes: "",
  tags: [],
  creator: "",
  characterVersion: "",
  nickname: "",
  avatarData: undefined,
};

// Default values for new lorebook entry
export const defaultLorebookEntry: LorebookEntryFormData = {
  keys: [],
  content: "",
  enabled: true,
  priority: 10,
  position: "before_char",
  insertionOrder: 100,
  caseSensitive: false,
  selective: false,
  secondaryKeys: [],
  constant: false,
  useRegex: false,
  name: undefined,
  comment: undefined,
};

// Editor tabs
export type EditorTab = "character" | "lorebook" | "assets";
