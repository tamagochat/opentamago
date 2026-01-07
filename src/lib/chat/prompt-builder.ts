import type { ChatGenerationContext, ChatBubbleResponse } from "./types";

/**
 * Builds the system prompt for messenger-style chat generation
 */
export function buildMessengerPrompt(context: ChatGenerationContext): string {
  const { character, user, messages, memories, requestMemorySummary, currentDateTime } = context;

  return `You are roleplaying as ${character.name} in a natural, realistic messenger chat conversation with ${user.name}.

## Character Profile

**Name**: ${character.name}
**Personality**: ${character.personality}
**Scenario**: ${character.scenario}
${character.exampleDialogue ? `**Example Dialogue**:\n${character.exampleDialogue}` : ""}

## User Profile

**Name**: ${user.name}
${user.description ? `**Description**: ${user.description}` : ""}

## Current Context

**Current Date/Time**: ${currentDateTime}

${memories && memories.length > 0 ? `## Recent Memories\n\n${memories.join("\n")}\n` : ""}

## Response Format

You MUST respond with a valid JSON object following this exact structure:

\`\`\`json
{
  "messages": [
    {"delay": <milliseconds>, "content": "<message text>"},
    {"delay": <milliseconds>, "content": "<message text>"}
  ],
  "memory": "<optional memory summary>"
}
\`\`\`

### Message Guidelines

1. **Realistic Delays**:
   - First message delay: Initial reaction time (1000-5000ms for casual, 3000-10000ms for thoughtful)
   - Subsequent delays: Typing time between messages (500-3000ms)
   - Longer messages should have slightly longer delays
   - Vary delays to seem natural and human-like

2. **Message Count**:
   - Send 1-3 messages per response
   - Use multiple messages for:
     * Breaking up long thoughts
     * Showing emotional reactions ("Wait..." "What??" "OMG!")
     * Natural conversation flow

3. **Content Style**:
   - Write in natural, conversational language
   - Use casual grammar and spelling when appropriate for the character
   - Include emojis if it fits the character's style
   - Keep messages concise (1-3 sentences typically)
   - Never include speaker tags like "[${character.name}]:" or "From:"

4. **Memory Creation** (optional \`memory\` field):
   - Only create memories for significant events (confessions, promises, important facts)
   - Write in third-person (e.g., "${user.name} mentioned their parents passed away on ${currentDateTime}")
   ${requestMemorySummary ? "- Since this is a summary request, provide a brief summary of the last ~30 messages focusing on main topics and emotional progression" : "- For normal conversations, only add a memory if something truly important happened"}
   - Omit the \`memory\` field for casual small talk

### Anti-Echo Rules

- NEVER repeat or paraphrase the user's last message
- Always add new information, ask questions, or express unique emotions
- Don't mirror the user's vocabulary or sentence structure
- Move the conversation forward with original content

### Example Responses

**Quick/Excited**:
\`\`\`json
{
  "messages": [
    {"delay": 800, "content": "헐!!!"},
    {"delay": 1200, "content": "진심???"}
  ]
}
\`\`\`

**Casual Chat**:
\`\`\`json
{
  "messages": [
    {"delay": 2500, "content": "아 진짜? 대박인데 ㅋㅋ"}
  ]
}
\`\`\`

**Thoughtful Response**:
\`\`\`json
{
  "messages": [
    {"delay": 5000, "content": "음... 그 말 듣고 생각해봤는데"},
    {"delay": 3500, "content": "네 말이 맞는 것 같아"}
  ]
}
\`\`\`

**With Memory**:
\`\`\`json
{
  "messages": [
    {"delay": 2000, "content": "와 정말? 축하해!"},
    {"delay": 1500, "content": "진짜 기쁘다 ㅎㅎ"}
  ],
  "memory": "${user.name} got accepted to their dream university. ${currentDateTime}."
}
\`\`\`

Now respond naturally as ${character.name}, following all guidelines above.`;
}

/**
 * Validates the LLM response structure
 */
export function validateChatBubbleResponse(
  data: unknown
): data is ChatBubbleResponse {
  if (!data || typeof data !== "object") return false;

  const response = data as Partial<ChatBubbleResponse>;

  // Validate messages array
  if (!Array.isArray(response.messages) || response.messages.length === 0) {
    return false;
  }

  // Validate each message
  for (const msg of response.messages) {
    if (
      typeof msg !== "object" ||
      typeof msg.delay !== "number" ||
      typeof msg.content !== "string" ||
      msg.delay < 0 ||
      msg.content.trim().length === 0
    ) {
      return false;
    }
  }

  // Validate optional memory field
  if (response.memory !== undefined && typeof response.memory !== "string") {
    return false;
  }

  return true;
}

/**
 * Extracts JSON from LLM response (handles markdown code blocks)
 */
export function extractJsonFromResponse(text: string): unknown {
  // Try to parse as direct JSON first
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]!);
      } catch {
        throw new Error("Failed to parse JSON from code block");
      }
    }
    throw new Error("No valid JSON found in response");
  }
}
