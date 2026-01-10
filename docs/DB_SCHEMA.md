# OpenTamago Database Schema

**Version:** 1.4.0
**Last Updated:** 2026-01-09

This document describes the database schemas used in OpenTamago. The application uses two types of databases:

1. **Client-Side (RxDB)** - Local browser storage using IndexedDB via Dexie.js
2. **Server-Side (PostgreSQL)** - Backend storage using Drizzle ORM

---

## Client-Side Database (RxDB)

All client-side data is stored locally in the browser using RxDB with Dexie.js (IndexedDB) storage.

### Collections Overview

| Collection | Version | Description |
|------------|---------|-------------|
| characters | 4 | Character definitions (CCv3 format) |
| chats | 1 | Chat sessions with characters |
| messages | 1 | Individual chat messages |
| personas | 0 | User personas |
| settings | 5 | Application settings |
| providerSettings | 0 | Provider API keys (credentials only) |
| generationSettings | 0 | Per-scenario generation settings |
| lorebookEntries | 1 | Character world information |
| memories | 1 | LRU-based context memory |
| connectSessions | 0 | P2P Connect session state |
| connectMessages | 0 | P2P Connect chat messages |
| characterAssets | 0 | Character image assets (CharX) |

---

### characters (v4)

Stores character definitions following the CharacterCardV3 specification.

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (36) | Yes | PK | UUID primary key |
| name | string (500) | Yes | Yes | Character name |
| description | string | No | No | Character description |
| personality | string | No | No | Personality traits |
| scenario | string | No | No | Default scenario |
| firstMessage | string | No | No | Opening message |
| exampleDialogue | string | No | No | Example conversations |
| systemPrompt | string | No | No | System instructions |
| postHistoryInstructions | string | No | No | Instructions after chat history |
| alternateGreetings | string[] | No | No | Alternative opening messages |
| creatorNotes | string | No | No | Notes from character creator |
| tags | string[] | No | No | Character tags |
| creator | string | No | No | Creator name |
| characterVersion | string | No | No | Character card version |
| groupOnlyGreetings | string[] | No | No | Group chat greetings |
| nickname | string | No | No | Display nickname |
| extensions | object | Yes | No | CCv3 extension data |
| creatorNotesMultilingual | object | No | No | Multilingual creator notes |
| source | string[] | No | No | Source URLs/IDs |
| avatarData | string | No | No | Base64 encoded avatar |
| createdAt | number | Yes | Yes | Unix timestamp (ms) |
| updatedAt | number | Yes | Yes | Unix timestamp (ms) |

**Indexes:** `createdAt`, `updatedAt`, `name`

---

### chats (v1)

Stores chat session metadata.

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (36) | Yes | PK | UUID primary key |
| characterId | string (36) | Yes | Yes | FK to characters |
| personaId | string (36) | No | No | FK to personas (optional) |
| title | string | Yes | No | Chat title |
| createdAt | number | Yes | Yes | Unix timestamp (ms) |
| updatedAt | number | Yes | No | Unix timestamp (ms) |
| lastMessageAt | number | Yes | Yes | Unix timestamp (ms) |

**Indexes:** `characterId`, `lastMessageAt`, `createdAt`

---

### messages (v1)

Stores individual chat messages.

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (36) | Yes | PK | UUID primary key |
| chatId | string (36) | Yes | Yes* | FK to chats |
| role | enum | Yes | No | "user" \| "assistant" \| "system" |
| content | string | Yes | No | Message content |
| createdAt | number | Yes | Yes* | Unix timestamp (ms) |
| editedAt | number | No | No | Edit timestamp (ms) |
| reasoning | string | No | No | Merged reasoning/thinking content from LLM |
| displayedContent | string | No | No | Translated or alternative displayed content |
| displayedContentLanguage | string (10) | No | No | Language code of displayedContent |

**Indexes:** `[chatId, createdAt]` (compound)

---

### personas (v0)

Stores user persona definitions.

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (36) | Yes | PK | UUID primary key |
| name | string (500) | Yes | Yes | Persona name |
| description | string | No | No | Persona description |
| avatarData | string | No | No | Base64 encoded avatar |
| createdAt | number | Yes | Yes | Unix timestamp (ms) |
| updatedAt | number | Yes | Yes | Unix timestamp (ms) |

**Indexes:** `createdAt`, `updatedAt`, `name`

---

### settings (v5)

Stores application settings (singleton pattern - uses "default" as id).

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (36) | Yes | PK | Fixed to "default" |
| apiMode | enum | Yes | No | "server" \| "client" (deprecated) |
| geminiApiKey | string | No | No | User's Gemini API key (deprecated) |
| defaultModel | string | Yes | No | Default AI model ID (deprecated) |
| temperature | number | Yes | No | (deprecated) Use generationSettings |
| maxTokens | number | Yes | No | (deprecated) Use generationSettings |
| safetySettings | object | Yes | No | (deprecated) Use generationSettings.metadata.safetySettings |
| chatBubbleTheme | enum | Yes | No | "roleplay" \| "messenger" |
| localeDialogDismissed | boolean | Yes | No | Locale dialog state |
| localeDialogShownAt | number | No | No | Unix timestamp (ms) |
| selectedProvider | string (50) | Yes | No | Active LLM provider ID |
| defaultPersonaId | string (36) | No | No | Default persona ID for new chats |
| updatedAt | number | Yes | No | Unix timestamp (ms) |

**Indexes:** None

**Notes:**
- `apiMode`, `geminiApiKey`, `defaultModel`, `temperature`, `maxTokens`, `safetySettings` are deprecated
- Use `providerSettings` for API keys, `generationSettings` for generation parameters
- `selectedProvider` values: "gemini", "openrouter", "anthropic", "grok", "openai", "nanogpt", "falai", "elevenlabs"
- Default: "gemini"

---

### providerSettings (v0)

Stores API credentials for each provider. Generation settings (model, temperature, etc.) are stored in `generationSettings`.

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (50) | Yes | PK | Provider ID (e.g., "gemini") |
| apiKey | string | No | No | Provider API key |
| enabled | boolean | Yes | No | Is provider configured (has API key) |
| baseUrl | string (500) | No | No | Custom API base URL |
| updatedAt | number | Yes | No | Unix timestamp (ms) |

**Indexes:** None

**Supported Providers:**
| Provider ID | Name | Modality | SDK |
|-------------|------|----------|-----|
| gemini | Google Gemini | text, image, voice | @ai-sdk/google |
| openrouter | OpenRouter | text, image, voice | @ai-sdk/openai |
| anthropic | Anthropic | text | @ai-sdk/anthropic |
| grok | Grok (xAI) | text | @ai-sdk/openai |
| openai | OpenAI | text, image, voice | @ai-sdk/openai |
| nanogpt | NanoGPT | text | @ai-sdk/openai |
| falai | Fal.ai | image | @ai-sdk/openai |
| elevenlabs | ElevenLabs | voice | custom |

---

### generationSettings (v0)

Stores per-scenario generation settings for different modalities (text, image, voice).

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (50) | Yes | PK | Scenario ID (see below) |
| modality | enum | Yes | No | "text" \| "image" \| "voice" |
| scenario | enum | No | No | "chat" \| "translation" \| "hitmeup" \| "aibot" (text only) |
| enabled | boolean | No | No | Is scenario enabled (default: true) |
| providerId | string (50) | Yes | No | Provider ID to use |
| model | string (100) | Yes | No | Model ID to use |
| temperature | number | No | No | Generation temperature (0-2) |
| maxTokens | integer | No | No | Max output tokens (1-65536) |
| thinking | boolean | No | No | Enable thinking/reasoning mode |
| imageWidth | integer | No | No | Image width in pixels (64-4096) |
| imageHeight | integer | No | No | Image height in pixels (64-4096) |
| metadata | object | No | No | Generation-specific settings |
| updatedAt | number | Yes | No | Unix timestamp (ms) |

**Indexes:** None

**Metadata Structure:**
The `metadata` field stores generation-specific settings.

Example for Gemini safety settings:
```json
{
  "safetySettings": {
    "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
    "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
    "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE"
  }
}
```

Example for translation target language:
```json
{
  "targetLanguage": "ko"
}
```

**Document IDs:**
| ID | Modality | Can Disable | Description |
|----|----------|-------------|-------------|
| text_chat | text | No | Main roleplay/conversation |
| text_translation | text | Yes | Message translation |
| text_hitmeup | text | Yes | Quick auto-reply |
| text_aibot | text | No | Automated bot responses |
| image | image | Yes | Image generation |
| voice | voice | Yes | Text-to-speech |

**Default Values:**
| Scenario | Enabled | Provider | Temperature | Max Tokens |
|----------|---------|----------|-------------|------------|
| text_chat | true | gemini | 0.9 | 4096 |
| text_translation | true | gemini | 0.3 | 2048 |
| text_hitmeup | true | gemini | 1.0 | 512 |
| text_aibot | true | gemini | 0.1 | 2048 |
| image | true | falai | - | - |
| voice | true | elevenlabs | - | - |

---

### lorebookEntries (v1)

Stores character world information entries (CCv3 lorebook format).

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (36) | Yes | PK | UUID primary key |
| characterId | string (36) | Yes | Yes | FK to characters |
| keys | string[] | Yes | No | Trigger keywords |
| content | string | Yes | No | Entry content |
| enabled | boolean | Yes | No | Is entry active |
| insertionOrder | number | Yes | No | Order in prompt |
| caseSensitive | boolean | Yes | No | Case-sensitive matching |
| priority | number | Yes | No | Entry priority |
| selective | boolean | Yes | No | Selective activation |
| secondaryKeys | string[] | Yes | No | Additional triggers |
| constant | boolean | Yes | No | Always active |
| position | string | Yes | No | Position in prompt |
| useRegex | boolean | Yes | No | Regex pattern mode |
| extensions | object | Yes | No | CCv3 extension data |
| name | string | No | No | Entry name |
| comment | string | No | No | Entry comment |
| createdAt | number | Yes | Yes | Unix timestamp (ms) |
| updatedAt | number | Yes | No | Unix timestamp (ms) |

**Indexes:** `characterId`, `createdAt`

---

### memories (v1)

Stores LRU-based context memory for intelligent prompt injection. Memories are populated from lorebook matches and can be manually added. The LRU (Least Recently Used) algorithm ensures the most relevant context stays active.

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (100) | Yes | PK | Derived from chatId + contentHash |
| chatId | string (36) | Yes | Yes* | FK to chats |
| characterId | string (36) | Yes | No | FK to characters |
| content | string | Yes | No | Interpolated memory content |
| contentHash | string (64) | Yes | No | Hash for deduplication |
| source | enum | Yes | No | "lorebook" \| "manual" \| "system" |
| sourceId | string (36) | No | No | Original source ID (e.g., lorebook entry ID) |
| createdAt | number | Yes | No | Unix timestamp (ms) |
| updatedAt | number | Yes | Yes* | Unix timestamp (ms) - LRU ordering |

**Indexes:** `[chatId, updatedAt]` (compound)

**Notes:**
- Default limit: 50 entries per chat
- When duplicate content is added, only `updatedAt` is refreshed (keeps content "hot")
- Supports recursive lorebook scanning (matched content triggers additional matches)
- `allowUser`/`allowCharacter` options filter entries containing `{{user}}`/`{{char}}` placeholders

---

### connectSessions (v0)

Stores P2P Connect session state for rejoin functionality.

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (36) | Yes | PK | "active" for singleton |
| sessionId | string (100) | Yes | No | Server session ID |
| slug | string (200) | Yes | No | Session URL slug |
| hostPeerId | string (100) | Yes | No | Host's peer ID |
| isHost | boolean | Yes | No | Is current user host |
| myPeerId | string (100) | Yes | No | Current user's peer ID |
| myCharacter | object | Yes | No | Character data object |
| participants | string | Yes | No | JSON stringified array |
| wasInChat | boolean | Yes | No | Was in chat room |
| createdAt | number | Yes | No | Unix timestamp (ms) |
| updatedAt | number | Yes | No | Unix timestamp (ms) |

**Indexes:** None

---

### connectMessages (v0)

Stores P2P Connect chat messages.

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (100) | Yes | PK | Message ID |
| sessionId | string (100) | Yes | Yes* | Session ID |
| messageData | string | Yes | No | JSON stringified message |
| timestamp | number | Yes | Yes* | Unix timestamp (ms) |
| peerId | string (100) | Yes | No | Sender peer ID |

**Indexes:** `[sessionId, timestamp]` (compound)

---

### characterAssets (v0)

Stores character image assets from CharX imports.

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| id | string (36) | Yes | PK | UUID primary key |
| characterId | string (36) | Yes | Yes | FK to characters |
| assetType | enum | Yes | Yes* | "icon" \| "emotion" \| "background" \| "other" |
| name | string | Yes | No | Asset name |
| uri | string | Yes | No | Original CharX URI |
| ext | string (10) | Yes | No | File extension |
| createdAt | number | Yes | No | Unix timestamp (ms) |
| updatedAt | number | Yes | No | Unix timestamp (ms) |

**Indexes:** `characterId`, `[characterId, assetType]` (compound)

---

## Server-Side Database (PostgreSQL)

All server-side tables are prefixed with `opentamago_` using Drizzle ORM.

### Tables Overview

| Table | Description |
|-------|-------------|
| opentamago_user | User accounts |
| opentamago_account | OAuth provider accounts |
| opentamago_session | User sessions |
| opentamago_verification_token | Email verification tokens |
| opentamago_post | User posts (example) |
| opentamago_file_share_channel | P2P file sharing channels |
| opentamago_connect_session | P2P Connect sessions |
| opentamago_connect_participant | Connect session participants |

---

### opentamago_user

User account information.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | varchar(255) | No | PK (UUID) |
| name | varchar(255) | Yes | Display name |
| email | varchar(255) | No | Email address |
| emailVerified | timestamp(tz) | Yes | Verification timestamp |
| image | varchar(255) | Yes | Avatar URL |

---

### opentamago_account

OAuth provider account links.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| userId | varchar(255) | No | FK to users |
| type | varchar(255) | No | Account type |
| provider | varchar(255) | No | OAuth provider |
| providerAccountId | varchar(255) | No | Provider's account ID |
| refresh_token | text | Yes | OAuth refresh token |
| access_token | text | Yes | OAuth access token |
| expires_at | integer | Yes | Token expiration |
| token_type | varchar(255) | Yes | Token type |
| scope | varchar(255) | Yes | OAuth scope |
| id_token | text | Yes | OIDC ID token |
| session_state | varchar(255) | Yes | Session state |

**Primary Key:** `(provider, providerAccountId)`
**Indexes:** `account_user_id_idx` on `userId`

---

### opentamago_session

User session tokens.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| sessionToken | varchar(255) | No | PK - Session token |
| userId | varchar(255) | No | FK to users |
| expires | timestamp(tz) | No | Session expiration |

**Indexes:** `t_user_id_idx` on `userId`

---

### opentamago_verification_token

Email verification tokens.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| identifier | varchar(255) | No | Email identifier |
| token | varchar(255) | No | Verification token |
| expires | timestamp(tz) | No | Token expiration |

**Primary Key:** `(identifier, token)`

---

### opentamago_post

Example user posts table.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | No | PK (auto-increment) |
| name | varchar(256) | Yes | Post name |
| createdById | varchar(255) | No | FK to users |
| createdAt | timestamp(tz) | No | Creation timestamp |
| updatedAt | timestamp(tz) | Yes | Update timestamp |

**Indexes:** `created_by_idx`, `name_idx`

---

### opentamago_file_share_channel

P2P file sharing channels.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | No | PK (auto-increment) |
| shortSlug | varchar(8) | No | Short URL slug (unique) |
| longSlug | varchar(128) | No | Long URL slug (unique) |
| secret | uuid | No | Channel secret |
| uploaderPeerId | varchar(64) | No | Uploader's peer ID |
| userId | varchar(255) | Yes | FK to users (optional) |
| fileName | varchar(255) | Yes | Shared file name |
| fileSize | bigint | Yes | File size (bytes) |
| hasPassword | boolean | Yes | Password protected |
| passwordHash | varchar(255) | Yes | Bcrypt password hash |
| expiresAt | timestamp(tz) | No | Channel expiration |
| createdAt | timestamp(tz) | No | Creation timestamp |
| lastRenewedAt | timestamp(tz) | No | Last renewal timestamp |

**Indexes:** `file_share_short_slug_idx`, `file_share_long_slug_idx`, `file_share_expires_at_idx`

---

### opentamago_connect_session

P2P Connect multi-character chat sessions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | No | PK (auto-increment) |
| shortSlug | varchar(8) | No | Short URL slug (unique) |
| longSlug | varchar(128) | No | Long URL slug (unique) |
| hostPeerId | varchar(64) | No | Host's peer ID |
| hostUserId | varchar(255) | Yes | FK to users (optional) |
| maxParticipants | integer | Yes | Max participants (default: 8) |
| isPublic | boolean | Yes | Public session flag |
| expiresAt | timestamp(tz) | No | Session expiration |
| createdAt | timestamp(tz) | No | Creation timestamp |
| lastActivityAt | timestamp(tz) | No | Last activity timestamp |

**Indexes:** `connect_short_slug_idx`, `connect_long_slug_idx`, `connect_expires_at_idx`

---

### opentamago_connect_participant

Connect session participants.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | No | PK (auto-increment) |
| sessionId | integer | No | FK to connect_session |
| peerId | varchar(64) | No | Participant's peer ID |
| characterName | varchar(255) | No | Character name |
| characterAvatar | text | Yes | Base64 avatar thumbnail |
| isHost | boolean | Yes | Is session host |
| joinedAt | timestamp(tz) | No | Join timestamp |
| leftAt | timestamp(tz) | Yes | Leave timestamp |

**Indexes:** `connect_participant_session_idx` on `sessionId`
**On Delete:** Cascade from `connect_session`

---

## Schema Migration Notes

### RxDB Migrations

- Migrations are handled in `src/lib/db/index.ts`
- Each schema version increment requires a migration strategy
- See `CLAUDE.md` for detailed migration guidelines

### Drizzle Migrations

```bash
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Run pending migrations
pnpm db:push      # Push schema directly (dev only)
```
