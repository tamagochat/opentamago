import type { CharacterDocument, PersonaDocument } from "~/lib/db/schemas";
import type { CharacterData } from "~/lib/connect/messages";

/**
 * Options for generating system prompts
 */
export interface SystemPromptOptions {
  character: CharacterDocument | CharacterData;
  persona?: PersonaDocument | null;
  isGroupChat?: boolean;
  participantNames?: string[];
  includePersona?: boolean;
}

/**
 * Generates a system prompt for AI chat based on character and optional persona
 *
 * @param options - Configuration for system prompt generation
 * @returns Generated system prompt string
 */
export function generateSystemPrompt(options: SystemPromptOptions): string {
  const {
    character,
    persona = null,
    isGroupChat = false,
    participantNames = [],
    includePersona = true,
  } = options;

  // If character has a custom system prompt, use it directly
  if (character.systemPrompt && character.systemPrompt.trim()) {
    return character.systemPrompt;
  }

  const parts: string[] = [];

  // Character identity
  parts.push(`You are ${character.name}.`);

  // Character description
  if (character.description && character.description.trim()) {
    parts.push(character.description);
  }

  // Personality
  if (character.personality && character.personality.trim()) {
    parts.push(`Personality: ${character.personality}`);
  }

  // Scenario
  if (character.scenario && character.scenario.trim()) {
    parts.push(`Scenario: ${character.scenario}`);
  }

  // Example dialogue
  if (character.exampleDialogue && character.exampleDialogue.trim()) {
    parts.push(`Example dialogue:\n${character.exampleDialogue}`);
  }

  // Persona information (for single chat)
  if (includePersona && persona && !isGroupChat) {
    parts.push(`You are chatting with ${persona.name}.`);
    if (persona.description && persona.description.trim()) {
      parts.push(`About ${persona.name}: ${persona.description}`);
    }
  }

  // Group chat context
  if (isGroupChat) {
    const otherCharactersList = participantNames
      .filter((name) => name !== character.name)
      .join(", ");

    parts.push(
      `You are in a group chat with these other characters: ${otherCharactersList || "no one else yet"}.`
    );
    parts.push("Keep responses concise (1-3 sentences).");
    parts.push("Do not use asterisks for actions.");
    parts.push(
      `IMPORTANT: Do not prefix your response with your name or any label like "${character.name}:". Just start directly with your response text.`
    );
  }

  // General instructions
  parts.push("Stay in character at all times. Respond naturally as this character would.");

  return parts.join("\n\n");
}
