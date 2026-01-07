# Chat Utilities Library

This library provides shared utilities for chat functionality across OpenTamago, including system prompt generation, message filtering, and lorebook matching.

## Modules

### System Prompt (`system-prompt.ts`)

Generates AI system prompts from character and persona data.

#### `generateSystemPrompt(options)`

Creates a system prompt for AI chat based on character and optional persona.

**Parameters:**
- `options.character` - CharacterDocument or CharacterData
- `options.persona?` - PersonaDocument (optional)
- `options.isGroupChat?` - Boolean, default `false`
- `options.participantNames?` - Array of participant character names (for group chat)
- `options.includePersona?` - Boolean, default `true` (adds persona info to prompt)

**Returns:** System prompt string

**Usage:**

```typescript
import { generateSystemPrompt } from "~/lib/chat";

// Single chat with persona
const prompt = generateSystemPrompt({
  character: myCharacter,
  persona: myPersona,
  isGroupChat: false,
  includePersona: true,
});

// Group chat
const prompt = generateSystemPrompt({
  character: myCharacter,
  isGroupChat: true,
  participantNames: ["Alice", "Bob", "Charlie"],
  includePersona: false,
});
```

**Behavior:**
- If `character.systemPrompt` exists, returns it directly (custom prompt override)
- Otherwise, builds prompt from: name, description, personality, scenario, example dialogue
- Adds persona information for single chats (if `includePersona` is true)
- Adds group chat context and conciseness instructions for group chats
- Always includes "stay in character" instructions

---

### Message Filters (`message-filters.ts`)

Filters and converts chat message history for AI consumption.

#### `filterMessages<T>(messages, options)`

Filters messages based on various criteria.

**Parameters:**
- `messages` - Array of filterable messages
- `options.maxMessages?` - Maximum number to return (keeps most recent)
- `options.includeSystem?` - Boolean, default `true`
- `options.afterTimestamp?` - Filter messages after this time
- `options.beforeTimestamp?` - Filter messages before this time

**Returns:** Filtered messages array

**Usage:**

```typescript
import { filterMessages } from "~/lib/chat";

// Get last 20 messages, excluding system
const filtered = filterMessages(messages, {
  maxMessages: 20,
  includeSystem: false,
});

// Get messages in time range
const filtered = filterMessages(messages, {
  afterTimestamp: Date.now() - 3600000, // Last hour
  beforeTimestamp: Date.now(),
});
```

#### `convertMessagesToApiFormat(messages)`

Converts MessageDocument array to AI API format.

**Returns:** `Array<{ role: "user" | "assistant" | "system"; content: string }>`

#### `convertChatMessagesToApiFormat(messages, myPeerId)`

Converts P2P ChatMessageType array to AI API format.

**Parameters:**
- `messages` - Array of ChatMessageType
- `myPeerId?` - Current peer ID (messages from this peer become "assistant" role)

**Returns:** `Array<{ role: "user" | "assistant"; content: string }>`

**Usage:**

```typescript
import { convertChatMessagesToApiFormat } from "~/lib/chat";

const apiMessages = convertChatMessagesToApiFormat(chatHistory, myPeerId);
// Format: { role: "user", content: "CharacterName: message text" }
```

---

### Lorebook Matcher (`lorebook-matcher.ts`)

Matches lorebook entries against messages based on keywords and priority.

#### `matchLorebooks(message, entries, options)`

Finds and ranks lorebook entries that match the given message.

**Parameters:**
- `message` - Message content to match against
- `entries` - Array of LorebookEntryDocument
- `options.limit?` - Number of top matches to return, default `3`
- `options.includeConstant?` - Include constant entries, default `true`
- `options.minScore?` - Minimum match score (0-1), default `0`

**Returns:** Array of LorebookMatch objects, sorted by priority and relevance

**Matching Logic:**
1. **Constant entries** - Always included (if enabled)
2. **Keyword matching** - Case-sensitive or insensitive based on entry settings
3. **Regex matching** - If `useRegex` is true in entry
4. **Selective matching** - Requires both primary AND secondary keys to match
5. **Sorting** - By priority (desc) → match score (desc) → insertion order (asc)

**Usage:**

```typescript
import { matchLorebooks, formatLorebooksForPrompt } from "~/lib/chat";

// Get top 3 matching entries
const matches = matchLorebooks(userMessage, lorebookEntries, {
  limit: 3,
  includeConstant: true,
  minScore: 0.1,
});

// Inject into system prompt
const lorebookText = formatLorebooksForPrompt(matches, "before_char");
const systemPrompt = `${lorebookText}\n\n${characterPrompt}`;
```

#### `getLorebookContent(matches)`

Extracts content strings from matched entries.

**Returns:** `string[]`

#### `formatLorebooksForPrompt(matches, position)`

Formats lorebook entries for system prompt injection.

**Parameters:**
- `matches` - Array of LorebookMatch
- `position` - `"before_char"` or `"after_char"`, default `"before_char"`

**Returns:** Formatted string with lorebook content

---

## Integration Examples

### Single Character Chat (with Persona)

```typescript
import { generateSystemPrompt, filterMessages } from "~/lib/chat";

const systemPrompt = generateSystemPrompt({
  character: selectedCharacter,
  persona: selectedPersona,
  isGroupChat: false,
  includePersona: true,
});

const recentMessages = filterMessages(storedMessages, { maxMessages: 50 });

const apiMessages = [
  { role: "system", content: systemPrompt },
  ...recentMessages.map(m => ({ role: m.role, content: m.content })),
];
```

### Group P2P Chat

```typescript
import { generateSystemPrompt, convertChatMessagesToApiFormat } from "~/lib/chat";

const systemPrompt = generateSystemPrompt({
  character: myCharacter,
  isGroupChat: true,
  participantNames: ["Alice", "Bob", "Charlie"],
  includePersona: false,
});

const apiMessages = [
  { role: "system", content: systemPrompt },
  ...convertChatMessagesToApiFormat(chatHistory, myPeerId),
];
```

### With Lorebooks

```typescript
import {
  generateSystemPrompt,
  matchLorebooks,
  formatLorebooksForPrompt
} from "~/lib/chat";

// Match relevant lorebook entries
const matches = matchLorebooks(lastUserMessage, lorebookEntries, { limit: 3 });

// Generate base system prompt
const basePrompt = generateSystemPrompt({
  character: myCharacter,
  persona: myPersona,
});

// Inject lorebooks
const beforeCharLore = formatLorebooksForPrompt(matches, "before_char");
const afterCharLore = formatLorebooksForPrompt(matches, "after_char");

const finalPrompt = [
  beforeCharLore,
  basePrompt,
  afterCharLore,
].filter(Boolean).join("\n\n");
```

---

## Future Enhancements

### Message Filters
- Token-based filtering (remove oldest messages to fit context window)
- Importance-based filtering (keep key messages, summarize less important ones)
- Automatic summarization of older messages

### Lorebook Matcher
- Support for more complex regex patterns
- Fuzzy keyword matching
- Entry expiration (disable after N matches)
- Context window awareness (dynamic entry selection based on available tokens)

### System Prompt
- Template system for custom prompt structures
- Dynamic prompt optimization based on model capabilities
- Multi-language system prompt generation
