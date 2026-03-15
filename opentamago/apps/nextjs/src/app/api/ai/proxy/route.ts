import { NextRequest } from "next/server";
import { env } from "~/env";

const ignoreHeadersRe = /^content-(?:encoding|length|range)$/i;

// Only allow Google's generative AI API
const ALLOWED_AI_HOSTS = ["generativelanguage.googleapis.com"] as const;

type ApiProvider = "google";

interface ProxyContext {
  requestId: string;
  provider: ApiProvider;
  targetUrl: string;
}

interface GoogleUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GoogleResponse {
  usageMetadata?: GoogleUsageMetadata;
  modelVersion?: string;
}

/**
 * Parse token usage from Google's response
 */
function parseGoogleTokenUsage(responseText: string): {
  model?: string;
  requestTokens: number;
  responseTokens: number;
  totalTokens: number;
} | null {
  try {
    const data = JSON.parse(responseText) as GoogleResponse;
    const usage = data.usageMetadata;

    if (usage) {
      return {
        model: data.modelVersion,
        requestTokens: usage.promptTokenCount ?? 0,
        responseTokens: usage.candidatesTokenCount ?? 0,
        totalTokens: usage.totalTokenCount ?? 0,
      };
    }
    return null;
  } catch {
    // Response might be streaming or invalid JSON
    return null;
  }
}

/**
 * Proxy fetch function that forwards requests while filtering problematic headers
 * Parses response for token usage and logs it
 */
async function proxyFetch(
  request: Request,
  context: ProxyContext
): Promise<Response> {
  const req = new Request(request);
  req.headers.delete("accept-encoding");
  req.headers.delete("Origin");
  req.headers.delete("host");

  const startTime = Date.now();
  let res: Response;

  try {
    res = await fetch(req);
  } catch (fetchError) {
    const latencyMs = Date.now() - startTime;
    console.error(
      `[AI/PROXY] [${context.requestId}] Upstream fetch failed:`,
      {
        provider: context.provider,
        targetUrl: context.targetUrl,
        latencyMs,
        error: fetchError instanceof Error ? fetchError.message : "Unknown fetch error",
      }
    );
    throw fetchError;
  }

  const latencyMs = Date.now() - startTime;

  if (!res.ok) {
    console.warn(
      `[AI/PROXY] [${context.requestId}] Upstream returned error:`,
      {
        provider: context.provider,
        targetUrl: context.targetUrl,
        status: res.status,
        statusText: res.statusText,
        latencyMs,
      }
    );
  }

  // Filter out headers that shouldn't be forwarded
  const headers: HeadersInit = Array.from(res.headers.entries()).filter(
    ([k]) => !ignoreHeadersRe.test(k) && k !== "strict-transport-security"
  );

  let clientStream = res.body;

  // Tee the stream to parse usage
  if (res.body && res.ok) {
    const [parseStream, responseStream] = res.body.tee();
    clientStream = responseStream;

    // Parse and log asynchronously without blocking the response
    void (async () => {
      try {
        const text = await new Response(parseStream).text();
        const usage = parseGoogleTokenUsage(text);

        if (usage) {
          console.log(
            `[AI/PROXY] [${context.requestId}] Token usage:`,
            {
              provider: context.provider,
              model: usage.model,
              requestTokens: usage.requestTokens,
              responseTokens: usage.responseTokens,
              totalTokens: usage.totalTokens,
              latencyMs,
            }
          );
        }
      } catch (err) {
        console.error(
          `[AI/PROXY] [${context.requestId}] Failed to parse response:`,
          err instanceof Error ? err.message : "Unknown error"
        );
      }
    })();
  }

  return new Response(clientStream, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

/**
 * POST /api/ai/proxy
 * Simple proxy endpoint that forwards requests to Google's generative AI API
 *
 * Query parameters:
 * - url: Target URL to proxy to (must be generativelanguage.googleapis.com)
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  // Reject requests in Vercel production environment
  if (process.env.VERCEL_ENV === "production") {
    console.warn(`[AI/PROXY] [${requestId}] Rejected request in production environment`);
    return new Response(
      JSON.stringify({ error: "Server API is not available in production" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      console.warn(`[AI/PROXY] [${requestId}] Missing url parameter`);
      return new Response(
        JSON.stringify({ error: "url parameter is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // SSRF Prevention: Validate URL is from allowed AI provider hosts
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      console.warn(`[AI/PROXY] [${requestId}] Invalid URL format`);
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_AI_HOSTS.includes(parsedUrl.hostname as typeof ALLOWED_AI_HOSTS[number])) {
      console.warn(`[AI/PROXY] [${requestId}] URL hostname not allowed: ${parsedUrl.hostname}`);
      return new Response(
        JSON.stringify({ error: "URL not allowed. Only generativelanguage.googleapis.com is supported." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error(`[AI/PROXY] [${requestId}] GOOGLE_GENERATIVE_AI_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: "Server API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[AI/PROXY] [${requestId}] Proxying request to: ${url}`);

    // Create new request with the target URL
    const proxyRequest = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      // @ts-expect-error - duplex needed for streaming
      duplex: "half",
    });

    // Set the Google API key header
    proxyRequest.headers.set("x-goog-api-key", apiKey);

    return await proxyFetch(proxyRequest, {
      requestId,
      provider: "google",
      targetUrl: url,
    });
  } catch (error: unknown) {
    console.error(
      `[AI/PROXY] [${requestId}] Unexpected proxy error:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Proxy request failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/ai/proxy
 * Same as POST but for GET requests
 */
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  // Reject requests in Vercel production environment
  if (process.env.VERCEL_ENV === "production") {
    console.warn(`[AI/PROXY] [${requestId}] Rejected request in production environment`);
    return new Response(
      JSON.stringify({ error: "Server API is not available in production" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      console.warn(`[AI/PROXY] [${requestId}] Missing url parameter`);
      return new Response(
        JSON.stringify({ error: "url parameter is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // SSRF Prevention: Validate URL is from allowed AI provider hosts
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      console.warn(`[AI/PROXY] [${requestId}] Invalid URL format`);
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_AI_HOSTS.includes(parsedUrl.hostname as typeof ALLOWED_AI_HOSTS[number])) {
      console.warn(`[AI/PROXY] [${requestId}] URL hostname not allowed: ${parsedUrl.hostname}`);
      return new Response(
        JSON.stringify({ error: "URL not allowed. Only generativelanguage.googleapis.com is supported." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error(`[AI/PROXY] [${requestId}] GOOGLE_GENERATIVE_AI_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: "Server API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[AI/PROXY] [${requestId}] Proxying GET request to: ${url}`);

    // Create new request with the target URL
    const proxyRequest = new Request(url, {
      method: "GET",
      headers: req.headers,
    });

    // Set the Google API key header
    proxyRequest.headers.set("x-goog-api-key", apiKey);

    return await proxyFetch(proxyRequest, {
      requestId,
      provider: "google",
      targetUrl: url,
    });
  } catch (error: unknown) {
    console.error(
      `[AI/PROXY] [${requestId}] Unexpected proxy error:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Proxy request failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
