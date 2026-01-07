/**
 * Example usage of chat utilities
 * These examples demonstrate how to use the chat library functions
 */

import type { CharacterDocument, PersonaDocument, LorebookEntryDocument } from "~/lib/db/schemas";
import { generateSystemPrompt } from "./system-prompt";
import { filterMessages } from "./message-filters";
import { matchLorebooks, formatLorebooksForPrompt } from "./lorebook-matcher";

// ============================================================================
// Example 1: Single Chat with Persona
// ============================================================================

export function exampleSingleChat() {
  const character: CharacterDocument = {
    id: "char-1",
    name: "Luna",
    description: "A mysterious lunar guardian with silver hair and moonlit eyes.",
    personality: "Calm, wise, occasionally playful",
    scenario: "You meet Luna in a moonlit forest clearing.",
    firstMessage: "The moonlight reflects in my eyes as I turn to face you.",
    exampleDialogue: "Luna: \"The night is full of secrets.\"\nUser: \"What secrets?\"\nLuna: \"Only those who listen can hear them.\"",
    systemPrompt: "",
    postHistoryInstructions: "",
    alternateGreetings: [],
    creatorNotes: "",
    tags: ["fantasy", "mystical"],
    creator: "example",
    characterVersion: "1.0",
    groupOnlyGreetings: [],
    nickname: "",
    extensions: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const persona: PersonaDocument = {
    id: "persona-1",
    name: "Traveler",
    description: "A wandering adventurer seeking ancient knowledge.",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const systemPrompt = generateSystemPrompt({
    character,
    persona,
    isGroupChat: false,
    includePersona: true,
  });

  console.log("Single Chat System Prompt:", systemPrompt);
  return systemPrompt;
}

// ============================================================================
// Example 2: Group Chat
// ============================================================================

export function exampleGroupChat() {
  const character: CharacterDocument = {
    id: "char-2",
    name: "Luna",
    description: "A mysterious lunar guardian.",
    personality: "Calm, wise",
    scenario: "",
    firstMessage: "",
    exampleDialogue: "",
    systemPrompt: "",
    postHistoryInstructions: "",
    alternateGreetings: [],
    creatorNotes: "",
    tags: [],
    creator: "",
    characterVersion: "",
    groupOnlyGreetings: [],
    nickname: "",
    extensions: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const systemPrompt = generateSystemPrompt({
    character,
    isGroupChat: true,
    participantNames: ["Luna", "Sol", "Nova"],
    includePersona: false,
  });

  console.log("Group Chat System Prompt:", systemPrompt);
  return systemPrompt;
}

// ============================================================================
// Example 3: Lorebook Matching
// ============================================================================

export function exampleLorebookMatching() {
  // Sample lorebook entries
  const entries: LorebookEntryDocument[] = [
    {
      id: "lore-1",
      characterId: "char-1",
      keys: ["moon", "lunar"],
      content: "The moon holds ancient power that only celestial beings can harness.",
      enabled: true,
      insertionOrder: 1,
      caseSensitive: false,
      priority: 10,
      selective: false,
      secondaryKeys: [],
      constant: false,
      position: "before_char",
      useRegex: false,
      extensions: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "lore-2",
      characterId: "char-1",
      keys: ["forest", "trees"],
      content: "The Moonlit Forest is a sacred place where time flows differently.",
      enabled: true,
      insertionOrder: 2,
      caseSensitive: false,
      priority: 5,
      selective: false,
      secondaryKeys: [],
      constant: false,
      position: "before_char",
      useRegex: false,
      extensions: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "lore-3",
      characterId: "char-1",
      keys: ["guardian"],
      content: "Guardians are sworn protectors of the celestial realm.",
      enabled: true,
      insertionOrder: 3,
      caseSensitive: false,
      priority: 8,
      selective: false,
      secondaryKeys: [],
      constant: false,
      position: "after_char",
      useRegex: false,
      extensions: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "lore-4",
      characterId: "char-1",
      keys: [],
      content: "Luna's backstory: Born under a blood moon, raised by elder spirits.",
      enabled: true,
      insertionOrder: 0,
      caseSensitive: false,
      priority: 100,
      selective: false,
      secondaryKeys: [],
      constant: true, // Always included
      position: "before_char",
      useRegex: false,
      extensions: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const userMessage = "Tell me about the moon and the forest guardian.";

  // Match lorebooks (limit to top 3)
  const matches = matchLorebooks(userMessage, entries, {
    limit: 3,
    includeConstant: true,
  });

  console.log("Matched Lorebooks:");
  matches.forEach((match) => {
    console.log(`- [Priority ${match.entry.priority}] ${match.entry.content}`);
    console.log(`  Matched keys: ${match.matchedKeys.join(", ")}`);
    console.log(`  Score: ${match.matchScore.toFixed(2)}`);
  });

  // Format for system prompt
  const beforeChar = formatLorebooksForPrompt(matches, "before_char");
  const afterChar = formatLorebooksForPrompt(matches, "after_char");

  console.log("\nBefore Character:", beforeChar);
  console.log("\nAfter Character:", afterChar);

  return { matches, beforeChar, afterChar };
}

// ============================================================================
// Example 4: Complete Integration
// ============================================================================

export function exampleCompleteIntegration() {
  const character: CharacterDocument = {
    id: "char-1",
    name: "Luna",
    description: "A mysterious lunar guardian.",
    personality: "Calm, wise",
    scenario: "Moonlit forest",
    firstMessage: "",
    exampleDialogue: "",
    systemPrompt: "",
    postHistoryInstructions: "",
    alternateGreetings: [],
    creatorNotes: "",
    tags: [],
    creator: "",
    characterVersion: "",
    groupOnlyGreetings: [],
    nickname: "",
    extensions: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const persona: PersonaDocument = {
    id: "persona-1",
    name: "Traveler",
    description: "A wandering adventurer.",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const lorebookEntries: LorebookEntryDocument[] = [
    {
      id: "lore-1",
      characterId: "char-1",
      keys: ["moon"],
      content: "The moon holds ancient power.",
      enabled: true,
      insertionOrder: 1,
      caseSensitive: false,
      priority: 10,
      selective: false,
      secondaryKeys: [],
      constant: false,
      position: "before_char",
      useRegex: false,
      extensions: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  const userMessage = "What do you know about the moon?";

  // 1. Match lorebooks
  const lorebookMatches = matchLorebooks(userMessage, lorebookEntries, { limit: 3 });
  const lorebooksBefore = formatLorebooksForPrompt(lorebookMatches, "before_char");
  const lorebooksAfter = formatLorebooksForPrompt(lorebookMatches, "after_char");

  // 2. Generate base system prompt
  const basePrompt = generateSystemPrompt({
    character,
    persona,
    isGroupChat: false,
    includePersona: true,
  });

  // 3. Combine everything
  const finalSystemPrompt = [lorebooksBefore, basePrompt, lorebooksAfter]
    .filter(Boolean)
    .join("\n\n");

  console.log("Final System Prompt with Lorebooks:");
  console.log(finalSystemPrompt);

  return finalSystemPrompt;
}
