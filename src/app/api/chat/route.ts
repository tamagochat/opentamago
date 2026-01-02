import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { env } from "~/env";
import {
  DEFAULT_MODEL,
  DEFAULT_SAFETY_SETTINGS_ARRAY,
  toGeminiSafetySettings,
  type SafetySettings,
} from "~/lib/ai";

type GeminiSafetySettingArray = { category: string; threshold: string }[];

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: Request) {
  const { messages, apiKey, model, temperature, maxTokens, safetySettings } =
    (await req.json()) as {
      messages: ChatMessage[];
      apiKey?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      safetySettings?: SafetySettings;
    };

  // Use provided API key (client mode) or fall back to server's env key (server mode)
  const effectiveApiKey = apiKey ?? env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!effectiveApiKey) {
    return new Response("API key is required. Configure your API key in settings or set GOOGLE_GENERATIVE_AI_API_KEY on the server.", { status: 400 });
  }

  const google = createGoogleGenerativeAI({ apiKey: effectiveApiKey });

  const modelName = model ?? DEFAULT_MODEL;
  const geminiSafetySettings: GeminiSafetySettingArray = safetySettings
    ? toGeminiSafetySettings(safetySettings)
    : [...DEFAULT_SAFETY_SETTINGS_ARRAY];

  const result = streamText({
    model: google(modelName),
    messages,
    temperature: temperature ?? 0.9,
    maxOutputTokens: maxTokens ?? 4096,
    providerOptions: {
      google: {
        safetySettings: geminiSafetySettings,
      },
    },
  });

  return result.toTextStreamResponse();
}
