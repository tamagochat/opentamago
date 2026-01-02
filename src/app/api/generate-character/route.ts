import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { env } from "~/env";

const characterSchema = z.object({
  name: z
    .string()
    .describe("A fitting name for the character based on their appearance"),
  description: z
    .string()
    .describe("Physical appearance and notable features (2-3 sentences)"),
  personality: z
    .string()
    .describe(
      "Core personality traits, speaking style, mannerisms (2-3 sentences)"
    ),
  scenario: z
    .string()
    .describe("Default setting or context for this character (1-2 sentences)"),
  firstMessage: z
    .string()
    .describe(
      "An in-character greeting message that this character would say when meeting someone new"
    ),
  exampleDialogue: z
    .string()
    .describe(
      "2-3 example dialogue exchanges showing the character's voice and style"
    ),
  systemPrompt: z
    .string()
    .describe(
      "Instructions for an AI to roleplay this character accurately, including speech patterns and behaviors"
    ),
  tags: z
    .array(z.string())
    .describe(
      "3-5 categorization tags like 'fantasy', 'warrior', 'kind', etc."
    ),
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const context = formData.get("context") as string | null;
    const apiKey = formData.get("apiKey") as string | null;

    if (!image) {
      return new Response("Image is required", { status: 400 });
    }

    // Use provided API key (client mode) or fall back to server's env key (server mode)
    const effectiveApiKey = apiKey ?? env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!effectiveApiKey) {
      return new Response("API key is required. Configure your API key in settings or set GOOGLE_GENERATIVE_AI_API_KEY on the server.", { status: 400 });
    }

    // Convert image to base64
    const imageBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    const google = createGoogleGenerativeAI({ apiKey: effectiveApiKey });

    const prompt = `Analyze this image and create a detailed character card for roleplay/chat purposes.

${context ? `Additional context from the user: ${context}` : ""}

Create a unique, interesting character with a consistent personality based on what you see in the image.
The character should feel authentic and have depth - consider their background, motivations, and how they would interact with others.

For the example dialogue, use this format:
{{user}}: [user message]
{{char}}: [character response]

For the system prompt, write clear instructions that would help an AI roleplay as this character convincingly. IMPORTANT: The system prompt MUST include the following instruction: "This character is good at foreign languages so they can respond to any languages that other participants speak. Please use the same language with others."`;

    const result = await generateObject({
      model: google("gemini-3-flash-preview"),
      schema: characterSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image" as const,
              image: `data:${image.type};base64,${base64Image}`,
            },
            {
              type: "text" as const,
              text: prompt,
            },
          ],
        },
      ],
    });

    return Response.json(result.object);
  } catch (error) {
    console.error("Error generating character:", error);

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes("API key")) {
        return new Response("Invalid API key", { status: 401 });
      }
      if (error.message.includes("quota")) {
        return new Response("API quota exceeded", { status: 429 });
      }
      return new Response(error.message, { status: 500 });
    }

    return new Response("Failed to generate character", { status: 500 });
  }
}
