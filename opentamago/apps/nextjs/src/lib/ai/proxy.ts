"use client";

/**
 * AI Proxy Provider - Routes AI requests through the server proxy
 *
 * This module provides:
 * - Custom fetch wrapper for proxy routing
 * - createProxyAI factory function compatible with AI SDK
 * - Automatic API key injection on server side
 */
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Get the base URL for API calls
 * In browser, use relative URL. In SSR, use absolute URL.
 */
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  // For SSR, we need the full URL
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Create a fetch wrapper that routes requests through the server proxy
 *
 * The proxy server handles:
 * - API key injection (uses GOOGLE_GENERATIVE_AI_API_KEY from server env)
 * - SSRF protection (only allows generativelanguage.googleapis.com)
 * - Token usage logging
 *
 * @returns A fetch-compatible function that routes through the proxy
 */
function createProxyFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const originalUrl = request.url;

    // Transform the URL to go through our proxy
    const baseUrl = getBaseUrl();
    const proxyUrl = `${baseUrl}/api/ai/proxy?url=${encodeURIComponent(originalUrl)}`;

    // Create new request with proxy URL
    const proxyRequest = new Request(proxyUrl, {
      method: request.method,
      headers: request.headers,
      body: init?.body ?? request.body,
      // @ts-expect-error - duplex needed for streaming
      duplex: "half",
    });

    // Remove any API key headers - the server will inject its own
    proxyRequest.headers.delete("x-goog-api-key");
    proxyRequest.headers.delete("Authorization");

    try {
      const response = await fetch(proxyRequest);

      // Log non-2xx responses for debugging
      if (!response.ok) {
        console.error(
          `[AI/Proxy] Request failed:`,
          response.status,
          response.statusText
        );
      }

      return response;
    } catch (error) {
      console.error("[AI/Proxy] Fetch error:", error);
      throw error;
    }
  };
}

/**
 * Create a proxy AI provider instance
 *
 * Uses the Google Generative AI SDK under the hood, but routes all requests
 * through the server proxy which handles API key management.
 *
 * @returns A provider function that creates model instances
 *
 * @example
 * const proxyAI = createProxyAI();
 * const model = proxyAI("gemini-2.5-flash");
 *
 * const result = await generateText({
 *   model,
 *   prompt: "Hello, world!",
 * });
 */
export function createProxyAI() {
  const proxyFetch = createProxyFetch();

  // Use a dummy API key since the real key is injected by the server
  return createGoogleGenerativeAI({
    fetch: proxyFetch,
    apiKey: "proxy-mode",
  });
}

/**
 * Singleton instance of the proxy AI provider
 * Use this for convenience when you don't need custom configuration
 */
let _proxyAI: ReturnType<typeof createProxyAI> | null = null;

export function getProxyAI() {
  if (!_proxyAI) {
    _proxyAI = createProxyAI();
  }
  return _proxyAI;
}
