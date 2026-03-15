/**
 * Web Worker for parsing CharX files off the main thread.
 */

import JSZip from "jszip";
import type {
  CharacterCardV3,
  CharacterCardV3Data,
  CharacterBook,
  LorebookEntry,
  Asset,
  RisuModule,
} from "./types";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit per file

/**
 * RPack decompression algorithm.
 */
class RPack {
  static decode(data: Uint8Array): string {
    if (!data || data.length === 0) {
      return "";
    }

    const dictionary: string[] = [];
    let result = "";
    let pos = 0;

    while (pos < data.length) {
      const byteVal = data[pos]!;
      pos++;

      if (byteVal < 128) {
        const char = String.fromCharCode(byteVal);
        result += char;

        if (result.length > 1) {
          const substr = result.slice(-2);
          if (!dictionary.includes(substr)) {
            dictionary.push(substr);
          }
        }
      } else {
        const dictIndex = byteVal - 128;
        if (dictIndex < dictionary.length) {
          const ref = dictionary[dictIndex]!;
          result += ref;

          if (result.length > 1) {
            const newSubstr =
              ref.length > 1
                ? result.slice(-ref.length - 1, -ref.length + 1)
                : result.slice(-2);
            if (!dictionary.includes(newSubstr)) {
              dictionary.push(newSubstr);
            }
          }
        }
      }
    }

    return result;
  }
}

/**
 * Parser for .risum module files.
 */
class ModuleParser {
  static readonly MAGIC_BYTE = 111;
  static readonly VERSION = 0;

  static parse(data: Uint8Array): RisuModule | null {
    if (!data || data.length < 6) {
      return null;
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    const magic = data[0];
    if (magic !== this.MAGIC_BYTE) {
      return null;
    }

    const version = data[1];
    if (version !== this.VERSION) {
      return null;
    }

    const mainDataLength = view.getUint32(2, true);
    const mainDataCompressed = data.slice(6, 6 + mainDataLength);
    let mainData: Record<string, unknown>;

    try {
      const mainDataJson = RPack.decode(mainDataCompressed);
      mainData = JSON.parse(mainDataJson) as Record<string, unknown>;
    } catch {
      try {
        const decoder = new TextDecoder();
        mainData = JSON.parse(decoder.decode(mainDataCompressed)) as Record<
          string,
          unknown
        >;
      } catch {
        return null;
      }
    }

    return {
      name: (mainData.name as string) || "",
      description: (mainData.description as string) || "",
      lorebook: (mainData.lorebook as Record<string, unknown>[]) || [],
      regex: (mainData.regex as Record<string, unknown>[]) || [],
      cjs: (mainData.cjs as string) || "",
      trigger: (mainData.trigger as Record<string, unknown>[]) || [],
      id: (mainData.id as string) || "",
      low_level_access: (mainData.lowLevelAccess as boolean) || false,
      hide_icon: (mainData.hideIcon as boolean) || false,
      background_embedding: (mainData.backgroundEmbedding as string) || "",
      assets: (mainData.assets as string[][]) || [],
      namespace: (mainData.namespace as string) || "",
      custom_module_toggle: (mainData.customModuleToggle as string) || "",
      mcp: mainData.mcp as Record<string, unknown> | undefined,
    };
  }
}

function parseCardJson(data: Record<string, unknown>): CharacterCardV3 {
  const cardData = (data.data || {}) as Record<string, unknown>;

  let charBook: CharacterBook | undefined;
  if (cardData.character_book) {
    const bookData = cardData.character_book as Record<string, unknown>;
    const entries: LorebookEntry[] = [];

    for (const entryData of (bookData.entries || []) as Record<
      string,
      unknown
    >[]) {
      entries.push({
        keys: (entryData.keys as string[]) || [],
        content: (entryData.content as string) || "",
        enabled: (entryData.enabled as boolean) ?? true,
        insertion_order: (entryData.insertion_order as number) ?? 100,
        case_sensitive: (entryData.case_sensitive as boolean) ?? false,
        priority: (entryData.priority as number) ?? 10,
        use_regex: (entryData.use_regex as boolean) ?? false,
        name: entryData.name as string | undefined,
        id: entryData.id as string | undefined,
        comment: entryData.comment as string | undefined,
        selective: (entryData.selective as boolean) ?? false,
        secondary_keys: (entryData.secondary_keys as string[]) || [],
        constant: (entryData.constant as boolean) ?? false,
        position: (entryData.position as string) || "before_char",
        extensions: (entryData.extensions as Record<string, unknown>) || {},
      });
    }

    charBook = {
      scan_depth: (bookData.scan_depth as number) ?? 100,
      token_budget: (bookData.token_budget as number) ?? 512,
      recursive_scanning: (bookData.recursive_scanning as boolean) ?? false,
      entries,
      extensions: (bookData.extensions as Record<string, unknown>) || {},
    };
  }

  const assets: Asset[] = [];
  for (const assetData of (cardData.assets || []) as Record<string, unknown>[]) {
    assets.push({
      type: (assetData.type as string) || "",
      uri: (assetData.uri as string) || "",
      name: (assetData.name as string) || "",
      ext: (assetData.ext as string) || "",
    });
  }

  const characterData: CharacterCardV3Data = {
    name: (cardData.name as string) || "",
    description: (cardData.description as string) || "",
    personality: (cardData.personality as string) || "",
    scenario: (cardData.scenario as string) || "",
    first_mes: (cardData.first_mes as string) || "",
    mes_example: (cardData.mes_example as string) || "",
    creator_notes: (cardData.creator_notes as string) || "",
    system_prompt: (cardData.system_prompt as string) || "",
    post_history_instructions:
      (cardData.post_history_instructions as string) || "",
    alternate_greetings: (cardData.alternate_greetings as string[]) || [],
    tags: (cardData.tags as string[]) || [],
    creator: (cardData.creator as string) || "",
    character_version: (cardData.character_version as string) || "",
    group_only_greetings: (cardData.group_only_greetings as string[]) || [],
    nickname: (cardData.nickname as string) || "",
    creation_date: cardData.creation_date as number | undefined,
    modification_date: cardData.modification_date as number | undefined,
    character_book: charBook,
    assets,
    extensions: (cardData.extensions as Record<string, unknown>) || {},
  };

  return {
    spec: (data.spec as string) || "chara_card_v3",
    spec_version: (data.spec_version as string) || "3.0",
    data: characterData,
  };
}

export interface WorkerResult {
  card: CharacterCardV3 | null;
  module: RisuModule | null;
  assets: Array<{ path: string; data: number[] }>;
  metadata: Array<{ id: string; data: Record<string, unknown> }>;
  excludedFiles: string[];
}

async function parseCharXInWorker(buffer: ArrayBuffer): Promise<WorkerResult> {
  const result: WorkerResult = {
    card: null,
    module: null,
    assets: [],
    metadata: [],
    excludedFiles: [],
  };

  const zip = await JSZip.loadAsync(buffer);

  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) {
      continue;
    }

    const data = await zipEntry.async("uint8array");

    if (data.length > MAX_FILE_SIZE) {
      result.excludedFiles.push(filename);
      continue;
    }

    if (filename === "card.json") {
      try {
        const decoder = new TextDecoder();
        const cardDict = JSON.parse(decoder.decode(data)) as Record<
          string,
          unknown
        >;
        result.card = parseCardJson(cardDict);
      } catch (e) {
        throw new Error("Failed to parse card.json");
      }
    } else if (filename === "module.risum") {
      result.module = ModuleParser.parse(data);
    } else if (filename.startsWith("assets/")) {
      // Convert Uint8Array to regular array for transfer
      result.assets.push({ path: filename, data: Array.from(data) });
    } else if (filename.startsWith("x_meta/")) {
      try {
        const decoder = new TextDecoder();
        const metadata = JSON.parse(decoder.decode(data)) as Record<
          string,
          unknown
        >;
        const assetId = filename.replace("x_meta/", "").replace(".json", "");
        result.metadata.push({ id: assetId, data: metadata });
      } catch {
        // Ignore metadata parse errors
      }
    }
  }

  return result;
}

// Worker message handler
self.onmessage = async (e: MessageEvent<ArrayBuffer>) => {
  try {
    const result = await parseCharXInWorker(e.data);
    self.postMessage({ success: true, data: result });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
