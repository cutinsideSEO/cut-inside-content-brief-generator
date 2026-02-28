// Direct Gemini API client for Edge Functions
// Replaces the frontend's Supabase proxy with direct REST API calls

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

/**
 * Configuration for a Gemini API call.
 */
export interface GeminiCallConfig {
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: object;
  thinkingConfig?: { thinkingBudget: number };
}

/**
 * Response from a Gemini API call.
 */
export interface GeminiResponse {
  text: string;
}

/**
 * Calls the Gemini REST API directly with the given model, content, and config.
 * Uses the GEMINI_API_KEY from Deno environment variables.
 *
 * @param model - The Gemini model name (e.g., 'gemini-3-pro-preview')
 * @param contents - The user message / prompt text
 * @param config - Generation config (system instruction, schema, thinking, etc.)
 * @returns The generated text response
 * @throws Error if the API returns an error or empty response
 */
export async function callGeminiDirect(
  model: string,
  contents: string,
  config: GeminiCallConfig
): Promise<GeminiResponse> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build the request body
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: contents }] }],
    generationConfig: {},
  };

  // System instruction
  if (config.systemInstruction) {
    body.systemInstruction = { parts: [{ text: config.systemInstruction }] };
  }

  // Generation config fields
  const genConfig: Record<string, unknown> = {};

  if (config.responseMimeType) {
    genConfig.responseMimeType = config.responseMimeType;
  }
  if (config.responseSchema) {
    genConfig.responseSchema = config.responseSchema;
  }
  if (config.thinkingConfig) {
    genConfig.thinkingConfig = config.thinkingConfig;
  }

  if (Object.keys(genConfig).length > 0) {
    body.generationConfig = genConfig;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Extract text from response, filtering out thinking/thought parts
  // Gemini 3 models return thinking parts with { text: "...", thought: true }
  // We only want the non-thought output parts
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((p: Record<string, unknown>) => p.text && !p.thought)
    ?.map((p: Record<string, unknown>) => p.text)
    ?.join('') || '';

  return { text };
}

/**
 * Retry wrapper for Gemini API calls.
 * Retries on transient errors with exponential backoff.
 *
 * @param operation - The async operation to retry
 * @param retries - Maximum number of attempts (default: 3)
 * @param delay - Initial delay in ms between retries (default: 2000)
 * @param timeoutMs - Per-attempt timeout in ms (default: 120000 / 2 minutes)
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 2000,
  timeoutMs = 120000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      // Race the operation against a per-attempt timeout
      let timeoutId: ReturnType<typeof setTimeout>;
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed. Retrying...`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < retries - 1) {
        const jitter = Math.random() * 500;
        const backoffDelay = delay * Math.pow(2, i) + jitter;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  throw lastError;
}
