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

import type { ParsedCharX, CharXSummary } from "./types";
import type { WorkerResult } from "./worker";

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
