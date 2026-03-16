export interface LorebookEntry {
  keys: string[];
  content: string;
  enabled: boolean;
  insertion_order: number;
  case_sensitive: boolean;
  priority: number;
  use_regex: boolean;
  name?: string;
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
  type: string;
  uri: string;
  name: string;
  ext: string;
}

export interface CharacterCardV3Data {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  creator_notes_multilingual?: Record<string, string>;
  system_prompt: string;
  post_history_instructions: string;
  alternate_greetings: string[];
  tags: string[];
  creator: string;
  character_version: string;
  group_only_greetings: string[];
  nickname: string;
  source?: string[];
  creation_date?: number;
  modification_date?: number;
  character_book?: CharacterBook;
  assets: Asset[];
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

export interface AssetItem {
  path: string;
  name: string;
  dataUrl: string;
}
