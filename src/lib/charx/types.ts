/**
 * TypeScript types for CharacterCardV3 specification.
 * Based on RisuAI's implementation.
 */

export interface LorebookEntry {
  keys: string[];
  content: string;
  enabled: boolean;
  insertion_order: number;
  case_sensitive: boolean;
  priority: number;
  id?: string;
  comment?: string;
  selective: boolean;
  secondary_keys: string[];
  constant: boolean;
  position: string;
  extensions: Record<string, unknown>;
}

export interface CharacterBook {
  scan_depth: number;
  token_budget: number;
  recursive_scanning: boolean;
  entries: LorebookEntry[];
  extensions: Record<string, unknown>;
}

export interface Asset {
  type: string; // 'emotion', 'icon', 'background', 'x-risu-asset', etc.
  uri: string; // URI scheme: 'embeded://', 'ccdefault:', 'data:', '__asset:N'
  name: string;
  ext: string; // 'png', 'jpg', 'jpeg', 'mp3', 'mp4', etc.
}

export interface CharacterCardV3Data {
  // Basic info
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;

  // Metadata
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  alternate_greetings: string[];
  tags: string[];
  creator: string;
  character_version: string;

  // Group chat specific
  group_only_greetings: string[];
  nickname: string;

  // Timestamps
  creation_date?: number; // Unix timestamp
  modification_date?: number;

  // World context
  character_book?: CharacterBook;

  // Assets
  assets: Asset[];

  // Extensions
  extensions: Record<string, unknown>;
}

export interface CharacterCardV3 {
  spec: string;
  spec_version: string;
  data: CharacterCardV3Data;
}

export interface RisuModule {
  name: string;
  description: string;
  lorebook: Record<string, unknown>[];
  regex: Record<string, unknown>[];
  cjs: string;
  trigger: Record<string, unknown>[];
  id: string;
  low_level_access: boolean;
  hide_icon: boolean;
  background_embedding: string;
  assets: string[][];
  namespace: string;
  custom_module_toggle: string;
  mcp?: Record<string, unknown>;
}

export interface ParsedCharX {
  card: CharacterCardV3 | null;
  module: RisuModule | null;
  assets: Map<string, Uint8Array>;
  metadata: Map<string, Record<string, unknown>>;
  excludedFiles: string[];
}

export interface CharXSummary {
  name: string;
  creator: string;
  character_version: string;
  description_length: number;
  personality_length: number;
  scenario_length: number;
  first_message_length: number;
  alternate_greetings_count: number;
  tags: string[];
  assets_count: number;
  has_character_book: boolean;
  lorebook_entries_count?: number;
  has_module: boolean;
  module_name?: string;
  module_trigger_count?: number;
  module_regex_count?: number;
  extracted_assets_count: number;
  creation_date?: string;
  modification_date?: string;
}
