#!/usr/bin/env node
/**
 * CLI tool for parsing .charx files locally.
 *
 * Usage:
 *   npx tsx src/lib/charx/cli.ts <file.charx> [output_dir]
 *
 * Example:
 *   npx tsx src/lib/charx/cli.ts character.charx ./output
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import JSZip from "jszip";

interface LorebookEntry {
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

interface CharacterBook {
  scan_depth: number;
  token_budget: number;
  recursive_scanning: boolean;
  entries: LorebookEntry[];
  extensions: Record<string, unknown>;
}

interface Asset {
  type: string;
  uri: string;
  name: string;
  ext: string;
}

interface CharacterCardV3Data {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  alternate_greetings: string[];
  tags: string[];
  creator: string;
  character_version: string;
  group_only_greetings: string[];
  nickname: string;
  creation_date?: number;
  modification_date?: number;
  character_book?: CharacterBook;
  assets: Asset[];
  extensions: Record<string, unknown>;
}

interface CharacterCardV3 {
  spec: string;
  spec_version: string;
  data: CharacterCardV3Data;
}

interface RisuModule {
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

const MAX_FILE_SIZE = 50 * 1024 * 1024;

class RPack {
  static decode(data: Uint8Array): string {
    if (!data || data.length === 0) return "";

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

class ModuleParser {
  static readonly MAGIC_BYTE = 111;
  static readonly VERSION = 0;

  static parse(data: Uint8Array): RisuModule | null {
    if (!data || data.length < 6) return null;

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const magic = data[0];
    if (magic !== this.MAGIC_BYTE) return null;

    const version = data[1];
    if (version !== this.VERSION) return null;

    const mainDataLength = view.getUint32(2, true);
    const mainDataCompressed = data.slice(6, 6 + mainDataLength);
    let mainData: Record<string, unknown>;

    try {
      const mainDataJson = RPack.decode(mainDataCompressed);
      mainData = JSON.parse(mainDataJson);
    } catch {
      try {
        const decoder = new TextDecoder();
        mainData = JSON.parse(decoder.decode(mainDataCompressed));
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

    for (const entryData of (bookData.entries || []) as Record<string, unknown>[]) {
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

  const assets: Asset[] = [];
  for (const assetData of (cardData.assets || []) as Record<string, unknown>[]) {
    assets.push({
      type: (assetData.type as string) || "",
      uri: (assetData.uri as string) || "",
      name: (assetData.name as string) || "",
      ext: (assetData.ext as string) || "",
    });
  }

  return {
    spec: (data.spec as string) || "chara_card_v3",
    spec_version: (data.spec_version as string) || "3.0",
    data: {
      name: (cardData.name as string) || "",
      description: (cardData.description as string) || "",
      personality: (cardData.personality as string) || "",
      scenario: (cardData.scenario as string) || "",
      first_mes: (cardData.first_mes as string) || "",
      mes_example: (cardData.mes_example as string) || "",
      creator_notes: (cardData.creator_notes as string) || "",
      system_prompt: (cardData.system_prompt as string) || "",
      post_history_instructions: (cardData.post_history_instructions as string) || "",
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
    },
  };
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getAssetCategory(path: string): string {
  if (path.includes("/emotion/")) return "emotion";
  if (path.includes("/icon/")) return "icon";
  if (path.includes("/background/")) return "background";
  return "other";
}

async function parseCharX(filePath: string, outputDir: string) {
  console.log(`\nParsing: ${filePath}`);
  console.log(`Output:  ${outputDir}\n`);

  // Read file
  const fileBuffer = readFileSync(filePath);
  const zip = await JSZip.loadAsync(fileBuffer);

  let card: CharacterCardV3 | null = null;
  let module: RisuModule | null = null;
  const assets: Map<string, Uint8Array> = new Map();
  const excludedFiles: string[] = [];

  // Parse ZIP contents
  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    const data = await zipEntry.async("uint8array");

    if (data.length > MAX_FILE_SIZE) {
      excludedFiles.push(filename);
      console.log(`  [SKIP] ${filename} (>${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      continue;
    }

    if (filename === "card.json") {
      const decoder = new TextDecoder();
      const cardDict = JSON.parse(decoder.decode(data));
      card = parseCardJson(cardDict);
      console.log(`  [OK] card.json`);
    } else if (filename === "module.risum") {
      module = ModuleParser.parse(data);
      console.log(`  [OK] module.risum`);
    } else if (filename.startsWith("assets/")) {
      assets.set(filename, data);
    }
  }

  if (!card) {
    console.error("\nError: No card.json found in the charx file");
    process.exit(1);
  }

  // Create output directories
  ensureDir(outputDir);
  ensureDir(join(outputDir, "assets", "emotion"));
  ensureDir(join(outputDir, "assets", "icon"));
  ensureDir(join(outputDir, "assets", "background"));
  ensureDir(join(outputDir, "assets", "other"));

  // Build URI to name mapping
  const uriToName = new Map<string, string>();
  for (const asset of card.data.assets) {
    if (asset.uri && asset.name) {
      const uri = asset.uri.replace("embeded://", "");
      uriToName.set(uri, asset.name);
    }
  }

  // Save card.json
  const cardPath = join(outputDir, "card.json");
  writeFileSync(cardPath, JSON.stringify(card, null, 2));
  console.log(`\nSaved: card.json`);

  // Save lorebook.json if exists
  if (card.data.character_book && card.data.character_book.entries.length > 0) {
    const lorebookPath = join(outputDir, "lorebook.json");
    writeFileSync(lorebookPath, JSON.stringify(card.data.character_book, null, 2));
    console.log(`Saved: lorebook.json (${card.data.character_book.entries.length} entries)`);
  }

  // Save module.json if exists
  if (module) {
    const modulePath = join(outputDir, "module.json");
    writeFileSync(modulePath, JSON.stringify(module, null, 2));
    console.log(`Saved: module.json`);
  }

  // Save assets
  let assetCount = 0;
  for (const [path, data] of assets) {
    const category = getAssetCategory(path);
    const originalFilename = basename(path);
    const name = uriToName.get(path);

    // Create filename with name if available
    let filename = originalFilename;
    if (name) {
      const ext = originalFilename.split(".").pop() || "";
      const base = originalFilename.replace(`.${ext}`, "");
      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
      filename = `${base}_${safeName}.${ext}`;
    }

    const assetPath = join(outputDir, "assets", category, filename);
    writeFileSync(assetPath, data);
    assetCount++;
  }

  if (assetCount > 0) {
    console.log(`Saved: ${assetCount} assets`);
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("Summary");
  console.log("=".repeat(50));
  console.log(`Character:    ${card.data.name}`);
  console.log(`Creator:      ${card.data.creator || "Unknown"}`);
  console.log(`Version:      ${card.data.character_version || "N/A"}`);
  console.log(`Tags:         ${card.data.tags.join(", ") || "None"}`);
  console.log(`Description:  ${card.data.description.length} chars`);
  console.log(`First Msg:    ${card.data.first_mes.length} chars`);
  console.log(`Alt Greets:   ${card.data.alternate_greetings.length}`);
  console.log(`Lorebook:     ${card.data.character_book?.entries.length || 0} entries`);
  console.log(`Assets:       ${assetCount} files`);
  console.log(`Has Module:   ${module ? "Yes" : "No"}`);

  if (excludedFiles.length > 0) {
    console.log(`\nExcluded:     ${excludedFiles.length} files (too large)`);
  }

  console.log("=".repeat(50));
  console.log(`\nOutput saved to: ${outputDir}`);
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
CharX Parser CLI

Usage:
  npx tsx src/lib/charx/cli.ts <file.charx> [output_dir]

Arguments:
  file.charx    Path to the .charx file to parse
  output_dir    Output directory (default: ./output)

Example:
  npx tsx src/lib/charx/cli.ts character.charx ./output
`);
  process.exit(0);
}

const inputFile = args[0]!;
const outputDir = args[1] || "./output";

if (!inputFile.endsWith(".charx")) {
  console.error("Error: File must have .charx extension");
  process.exit(1);
}

if (!existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

parseCharX(inputFile, outputDir).catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
