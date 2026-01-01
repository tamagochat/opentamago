/**
 * CharX file parser for RisuAI character cards.
 * TypeScript port of pycharx.
 *
 * A .charx file is a ZIP archive containing:
 * - card.json: CharacterCardV3 specification
 * - module.risum: (Optional) Trigger scripts and custom scripts
 * - assets/: (Optional) Character images and resources
 * - x_meta/: (Optional) Asset metadata
 */

import JSZip from "jszip";
import type {
  CharacterCardV3,
  CharacterCardV3Data,
  CharacterBook,
  LorebookEntry,
  Asset,
  RisuModule,
  ParsedCharX,
  CharXSummary,
} from "./types";
import type { WorkerResult } from "./worker";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit per file

/**
 * RPack decompression algorithm.
 * Based on RisuAI's implementation.
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
        // Direct UTF-8 character (ASCII range)
        const char = String.fromCharCode(byteVal);
        result += char;

        // Build dictionary
        if (result.length > 1) {
          const substr = result.slice(-2);
          if (!dictionary.includes(substr)) {
            dictionary.push(substr);
          }
        }
      } else {
        // Dictionary reference
        const dictIndex = byteVal - 128;
        if (dictIndex < dictionary.length) {
          const ref = dictionary[dictIndex]!;
          result += ref;

          // Update dictionary with new combinations
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

    // Read magic byte
    const magic = data[0];
    if (magic !== this.MAGIC_BYTE) {
      console.warn(`Invalid magic byte: ${magic}, expected ${this.MAGIC_BYTE}`);
      return null;
    }

    // Read version
    const version = data[1];
    if (version !== this.VERSION) {
      console.warn(`Unsupported version: ${version}, expected ${this.VERSION}`);
      return null;
    }

    // Read main data length (4 bytes, little-endian)
    const mainDataLength = view.getUint32(2, true);

    // Read and decompress main data
    const mainDataCompressed = data.slice(6, 6 + mainDataLength);
    let mainData: Record<string, unknown>;

    try {
      const mainDataJson = RPack.decode(mainDataCompressed);
      mainData = JSON.parse(mainDataJson) as Record<string, unknown>;
    } catch {
      // Try direct JSON parsing (uncompressed)
      try {
        const decoder = new TextDecoder();
        mainData = JSON.parse(decoder.decode(mainDataCompressed)) as Record<
          string,
          unknown
        >;
      } catch {
        console.warn("Failed to parse module data");
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

/**
 * Parse card.json into CharacterCardV3
 */
function parseCardJson(data: Record<string, unknown>): CharacterCardV3 {
  const cardData = (data.data || {}) as Record<string, unknown>;

  // Parse character book
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

  // Parse assets
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

/**
 * Parse a .charx file from a File or ArrayBuffer
 */
export async function parseCharX(
  input: File | ArrayBuffer
): Promise<ParsedCharX> {
  const result: ParsedCharX = {
    card: null,
    module: null,
    assets: new Map(),
    metadata: new Map(),
    excludedFiles: [],
  };

  const zip = await JSZip.loadAsync(input);

  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    // Skip directories
    if (zipEntry.dir) {
      continue;
    }

    // Check if file would be too large
    // Note: JSZip doesn't expose uncompressed size before reading,
    // so we'll read and check after
    const data = await zipEntry.async("uint8array");

    if (data.length > MAX_FILE_SIZE) {
      result.excludedFiles.push(filename);
      console.warn(
        `Excluding large file (>${MAX_FILE_SIZE / 1024 / 1024}MB): ${filename}`
      );
      continue;
    }

    // Process special files
    if (filename === "card.json") {
      try {
        const decoder = new TextDecoder();
        const cardDict = JSON.parse(decoder.decode(data)) as Record<
          string,
          unknown
        >;
        result.card = parseCardJson(cardDict);
      } catch (e) {
        console.error("Failed to parse card.json:", e);
        throw new Error("Failed to parse card.json");
      }
    } else if (filename === "module.risum") {
      result.module = ModuleParser.parse(data);
    } else if (filename.startsWith("assets/")) {
      result.assets.set(filename, data);
    } else if (filename.startsWith("x_meta/")) {
      try {
        const decoder = new TextDecoder();
        const metadata = JSON.parse(decoder.decode(data)) as Record<
          string,
          unknown
        >;
        // Extract asset ID from filename (e.g., "x_meta/123.json" -> "123")
        const assetId = filename.replace("x_meta/", "").replace(".json", "");
        result.metadata.set(assetId, metadata);
      } catch (e) {
        console.warn(`Failed to parse metadata ${filename}:`, e);
      }
    }
  }

  return result;
}

/**
 * Get a summary of the parsed charx content
 */
export function getCharXSummary(parsed: ParsedCharX): CharXSummary | null {
  if (!parsed.card) {
    return null;
  }

  const card = parsed.card.data;

  const summary: CharXSummary = {
    name: card.name,
    creator: card.creator,
    character_version: card.character_version,
    description_length: card.description.length,
    personality_length: card.personality.length,
    scenario_length: card.scenario.length,
    first_message_length: card.first_mes.length,
    alternate_greetings_count: card.alternate_greetings.length,
    tags: card.tags,
    assets_count: card.assets.length,
    has_character_book: !!card.character_book,
    has_module: !!parsed.module,
    extracted_assets_count: parsed.assets.size,
  };

  if (card.character_book) {
    summary.lorebook_entries_count = card.character_book.entries.length;
  }

  if (parsed.module) {
    summary.module_name = parsed.module.name;
    summary.module_trigger_count = parsed.module.trigger.length;
    summary.module_regex_count = parsed.module.regex.length;
  }

  if (card.creation_date) {
    summary.creation_date = new Date(card.creation_date).toISOString();
  }

  if (card.modification_date) {
    summary.modification_date = new Date(card.modification_date).toISOString();
  }

  return summary;
}

/**
 * Convert asset data to a data URL for display
 */
export function assetToDataUrl(
  data: Uint8Array,
  filename: string
): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  let mimeType: string;

  switch (ext) {
    case "png":
      mimeType = "image/png";
      break;
    case "jpg":
    case "jpeg":
      mimeType = "image/jpeg";
      break;
    case "gif":
      mimeType = "image/gif";
      break;
    case "webp":
      mimeType = "image/webp";
      break;
    case "svg":
      mimeType = "image/svg+xml";
      break;
    case "mp3":
      mimeType = "audio/mpeg";
      break;
    case "mp4":
      mimeType = "video/mp4";
      break;
    case "webm":
      mimeType = "video/webm";
      break;
    default:
      mimeType = "application/octet-stream";
  }

  // Convert Uint8Array to base64
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!);
  }
  const base64 = btoa(binary);

  return `data:${mimeType};base64,${base64}`;
}

/**
 * Get categorized assets from parsed charx
 */
export function getCategorizedAssets(parsed: ParsedCharX): {
  emotions: Array<{ path: string; name: string; dataUrl: string }>;
  icons: Array<{ path: string; name: string; dataUrl: string }>;
  backgrounds: Array<{ path: string; name: string; dataUrl: string }>;
  other: Array<{ path: string; name: string; dataUrl: string }>;
} {
  const result = {
    emotions: [] as Array<{ path: string; name: string; dataUrl: string }>,
    icons: [] as Array<{ path: string; name: string; dataUrl: string }>,
    backgrounds: [] as Array<{ path: string; name: string; dataUrl: string }>,
    other: [] as Array<{ path: string; name: string; dataUrl: string }>,
  };

  // Build URI to name mapping from card.json assets
  const uriToName = new Map<string, string>();
  if (parsed.card) {
    for (const asset of parsed.card.data.assets) {
      if (asset.uri && asset.name) {
        // Normalize URI (remove embeded:// prefix if present)
        const uri = asset.uri.replace("embeded://", "");
        uriToName.set(uri, asset.name);
      }
    }
  }

  for (const [path, data] of parsed.assets) {
    const dataUrl = assetToDataUrl(data, path);
    if (!dataUrl) continue;

    const name = uriToName.get(path) || path.split("/").pop() || path;

    const item = { path, name, dataUrl };

    if (path.includes("/emotion/")) {
      result.emotions.push(item);
    } else if (path.includes("/icon/")) {
      result.icons.push(item);
    } else if (path.includes("/background/")) {
      result.backgrounds.push(item);
    } else {
      result.other.push(item);
    }
  }

  return result;
}

/**
 * Parse a .charx file using a Web Worker to avoid blocking the main thread.
 * This is the recommended method for large files.
 */
export async function parseCharXAsync(file: File): Promise<ParsedCharX> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (
      e: MessageEvent<{ success: boolean; data?: WorkerResult; error?: string }>
    ) => {
      worker.terminate();

      if (e.data.success && e.data.data) {
        const workerResult = e.data.data;

        // Convert worker result back to ParsedCharX format
        const result: ParsedCharX = {
          card: workerResult.card,
          module: workerResult.module,
          assets: new Map(
            workerResult.assets.map((a) => [a.path, new Uint8Array(a.data)])
          ),
          metadata: new Map(workerResult.metadata.map((m) => [m.id, m.data])),
          excludedFiles: workerResult.excludedFiles,
        };

        resolve(result);
      } else {
        reject(new Error(e.data.error || "Worker failed"));
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "Worker error"));
    };

    // Read file and send to worker
    file.arrayBuffer().then((buffer) => {
      worker.postMessage(buffer, [buffer]);
    });
  });
}
