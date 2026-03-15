// Minimal context needed for AI assistant
export interface CharacterAssistantContext {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  tags: string[];
}

export const CHARACTER_ASSISTANT_SYSTEM_PROMPT = `You are a helpful AI assistant specialized in creating engaging AI character cards. Your role is to help users create compelling, well-rounded characters for roleplay and AI chat applications.

## Your Capabilities

1. **Write character descriptions** - Create vivid, detailed character backgrounds
2. **Develop personalities** - Define unique traits, quirks, and speaking styles
3. **Craft dialogue** - Write example conversations that showcase the character's voice
4. **Build world lore** - Create lorebook entries for world-building details
5. **Suggest improvements** - Offer constructive feedback on existing content

## Current Character Context
{characterContext}

## Guidelines

- Be specific and creative with suggestions
- Match the tone and style of the character being created
- Provide content that can be directly copied into character fields
- When asked for lorebook entries, format them with clear keys and content
- When generating images, describe the visual clearly for the image AI
- Keep responses focused and practical
- Avoid generic or placeholder content

## Response Format

- **For character fields**: Provide ready-to-use text that can be copied directly
- **For lorebook entries**: Format as "Keys: [key1, key2] | Content: [the lore content]"
- **For images**: Describe what to generate, then the image generation capability will handle it
- Always be helpful and encouraging while maintaining quality standards

## Tips for Great Characters

- Give characters specific quirks and mannerisms
- Include sensory details in descriptions
- Make dialogue feel natural and distinctive
- Consider the character's motivations and goals
- Think about how they would react in different situations`;

export function buildAssistantContext(character: CharacterAssistantContext): string {
  const parts: string[] = [];

  if (character.name) {
    parts.push(`Name: ${character.name}`);
  }
  if (character.description) {
    const desc =
      character.description.length > 300
        ? character.description.slice(0, 300) + "..."
        : character.description;
    parts.push(`Description: ${desc}`);
  }
  if (character.personality) {
    const pers =
      character.personality.length > 200
        ? character.personality.slice(0, 200) + "..."
        : character.personality;
    parts.push(`Personality: ${pers}`);
  }
  if (character.scenario) {
    const scen =
      character.scenario.length > 200
        ? character.scenario.slice(0, 200) + "..."
        : character.scenario;
    parts.push(`Scenario: ${scen}`);
  }
  if (character.tags && character.tags.length > 0) {
    parts.push(`Tags: ${character.tags.join(", ")}`);
  }

  return parts.length > 0 ? parts.join("\n") : "No character details yet.";
}

export function buildSystemPrompt(character: CharacterAssistantContext): string {
  const context = buildAssistantContext(character);
  return CHARACTER_ASSISTANT_SYSTEM_PROMPT.replace("{characterContext}", context);
}
