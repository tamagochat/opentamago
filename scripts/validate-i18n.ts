#!/usr/bin/env tsx
/**
 * Validates that all locale files have the same keys as the English (en.json) locale.
 * This script is run as a pre-push hook to ensure i18n consistency.
 *
 * Usage:
 *   pnpm i18n:validate              # Validate all locales
 *   pnpm i18n:validate --locale ja  # Validate only Japanese
 *   pnpm i18n:validate --locale ja ko  # Validate Japanese and Korean
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const MESSAGES_DIR = join(process.cwd(), "src/i18n/messages");
const REFERENCE_LOCALE = "en";

/**
 * Parse command line arguments for --locale flag
 */
function parseArgs(): string[] {
  const args = process.argv.slice(2);
  const localeIndex = args.indexOf("--locale");

  if (localeIndex === -1) {
    return []; // No filter, validate all
  }

  // Collect all arguments after --locale until we hit another flag or end
  const locales: string[] = [];
  for (let i = localeIndex + 1; i < args.length; i++) {
    const arg = args[i];
    if (!arg || arg.startsWith("-")) break;
    locales.push(arg);
  }

  return locales;
}

interface NestedObject {
  [key: string]: string | NestedObject;
}

/**
 * Recursively extracts all keys from a nested object with dot notation
 */
function extractKeys(obj: NestedObject, prefix = ""): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === "object" && value !== null) {
      keys.push(...extractKeys(value as NestedObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Loads and parses a JSON locale file
 */
function loadLocale(filename: string): NestedObject | null {
  const filepath = join(MESSAGES_DIR, filename);
  try {
    const content = readFileSync(filepath, "utf-8");
    return JSON.parse(content) as NestedObject;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`\x1b[31mJSON syntax error in ${filename}:\x1b[0m ${error.message}`);
      return null;
    }
    throw error;
  }
}

/**
 * Main validation function
 */
function validateLocales(filterLocales: string[]): boolean {
  const allFiles = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json"));
  const referenceFile = `${REFERENCE_LOCALE}.json`;

  if (!allFiles.includes(referenceFile)) {
    console.error(`Reference locale file ${referenceFile} not found`);
    process.exit(1);
  }

  const referenceLocale = loadLocale(referenceFile);
  if (!referenceLocale) {
    console.error(`Failed to parse reference locale ${referenceFile}`);
    process.exit(1);
  }
  const referenceKeys = new Set(extractKeys(referenceLocale));

  console.log(`Reference locale (${REFERENCE_LOCALE}): ${referenceKeys.size} keys\n`);

  // Filter files based on --locale argument
  let filesToCheck = allFiles.filter((f) => f !== referenceFile);

  if (filterLocales.length > 0) {
    const requestedFiles = filterLocales.map((l) => `${l}.json`);
    const invalidLocales = filterLocales.filter(
      (l) => !allFiles.includes(`${l}.json`)
    );

    if (invalidLocales.length > 0) {
      console.error(
        `\x1b[31mUnknown locale(s): ${invalidLocales.join(", ")}\x1b[0m`
      );
      console.error(
        `Available locales: ${allFiles.map((f) => f.replace(".json", "")).join(", ")}`
      );
      process.exit(1);
    }

    filesToCheck = filesToCheck.filter((f) => requestedFiles.includes(f));
    console.log(`Checking ${filterLocales.length} locale(s): ${filterLocales.join(", ")}\n`);
  }

  let hasErrors = false;

  for (const file of filesToCheck) {
    const localeName = file.replace(".json", "");
    const locale = loadLocale(file);

    if (!locale) {
      hasErrors = true;
      continue;
    }

    const localeKeys = new Set(extractKeys(locale));

    const missingKeys: string[] = [];
    const extraKeys: string[] = [];

    // Find missing keys (in reference but not in this locale)
    for (const key of referenceKeys) {
      if (!localeKeys.has(key)) {
        missingKeys.push(key);
      }
    }

    // Find extra keys (in this locale but not in reference)
    for (const key of localeKeys) {
      if (!referenceKeys.has(key)) {
        extraKeys.push(key);
      }
    }

    if (missingKeys.length === 0 && extraKeys.length === 0) {
      console.log(`\x1b[32m✓\x1b[0m ${localeName}: ${localeKeys.size} keys (matches reference)`);
    } else {
      hasErrors = true;
      console.log(`\x1b[31m✗\x1b[0m ${localeName}: ${localeKeys.size} keys`);

      if (missingKeys.length > 0) {
        console.log(`  \x1b[33mMissing ${missingKeys.length} keys:\x1b[0m`);
        for (const key of missingKeys.slice(0, 10)) {
          console.log(`    - ${key}`);
        }
        if (missingKeys.length > 10) {
          console.log(`    ... and ${missingKeys.length - 10} more`);
        }
      }

      if (extraKeys.length > 0) {
        console.log(`  \x1b[36mExtra ${extraKeys.length} keys:\x1b[0m`);
        for (const key of extraKeys.slice(0, 10)) {
          console.log(`    - ${key}`);
        }
        if (extraKeys.length > 10) {
          console.log(`    ... and ${extraKeys.length - 10} more`);
        }
      }
    }
  }

  console.log("");

  if (hasErrors) {
    console.log("\x1b[31mValidation failed!\x1b[0m Some locales are missing keys or have extra keys.");
    console.log("Please ensure all locale files have the same keys as en.json");
    return false;
  }

  console.log("\x1b[32mAll locale files are in sync with en.json\x1b[0m");
  return true;
}

// Run validation
const filterLocales = parseArgs();
const success = validateLocales(filterLocales);
process.exit(success ? 0 : 1);
