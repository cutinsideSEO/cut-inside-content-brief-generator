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
  /** Sampling temperature (0-2). Lower = more deterministic. */
  temperature?: number;
  /** Nucleus sampling probability mass (0-1). */
  topP?: number;
  /**
   * Max output tokens. IMPORTANT for Gemini 3: thinking tokens count toward this
   * budget, so it MUST exceed thinkingBudget + expected output. Leave unset to
   * avoid truncation unless you can guarantee a generous value.
   */
  maxOutputTokens?: number;
  /**
   * When true, attach the Google Search grounding tool so the model can ground
   * its output in live web results (improves factual accuracy / E-E-A-T).
   *
   * IMPORTANT: grounding does NOT combine reliably with `responseSchema` —
   * structured-output requests must NOT use grounding. This client defensively
   * ignores `useSearchGrounding` whenever `responseSchema` is set, so a caller
   * can never accidentally produce that invalid combination.
   *
   * Only enable this for NON-structured (free-text / prose) calls.
   */
  useSearchGrounding?: boolean;
}

/**
 * The Google Search grounding tool object for the v1beta `generateContent` REST
 * API. For Gemini 3 models the shape is `{ google_search: {} }` inside the
 * top-level `tools` array (this is the generateContent shape; the separate
 * "Interactions API" uses `{ type: "google_search" }` instead — do not confuse
 * the two). Isolated as a constant so the exact field naming is trivial to
 * correct in one place if Google changes it.
 */
const GOOGLE_SEARCH_TOOL = { google_search: {} } as const;

/**
 * Response from a Gemini API call.
 */
export interface GeminiResponse {
  text: string;
  /**
   * Grounding metadata from the candidate when Google Search grounding was used
   * (search queries, web sources, citation supports). Present only on grounded
   * responses; undefined otherwise. Captured opportunistically — callers may
   * ignore it.
   */
  groundingMetadata?: unknown;
}

/**
 * Calls the Gemini REST API directly with the given model, content, and config.
 * Uses the GEMINI_API_KEY from Deno environment variables.
 *
 * @param model - The Gemini model name (e.g., 'gemini-3.1-pro-preview')
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
  if (typeof config.temperature === 'number') {
    genConfig.temperature = config.temperature;
  }
  if (typeof config.topP === 'number') {
    genConfig.topP = config.topP;
  }
  if (typeof config.maxOutputTokens === 'number') {
    genConfig.maxOutputTokens = config.maxOutputTokens;
  }

  if (Object.keys(genConfig).length > 0) {
    body.generationConfig = genConfig;
  }

  // Google Search grounding (free-text calls only). Defensively refuse to combine
  // grounding with structured output — the two are not reliably compatible, and a
  // grounded structured-output request can fail or silently drop the schema. If a
  // caller sets both, grounding is dropped and the schema wins.
  if (config.useSearchGrounding) {
    if (config.responseSchema) {
      console.warn(
        '[gemini-client] useSearchGrounding ignored: responseSchema is set ' +
        '(grounding is not compatible with structured output).'
      );
    } else {
      body.tools = [GOOGLE_SEARCH_TOOL];
    }
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

  // Inspect finishReason so truncation/safety blocks surface via the retry+error
  // path instead of returning silently-truncated (or empty) content.
  // STOP = normal completion; undefined = older response shape with usable text.
  // Anything else (MAX_TOKENS, SAFETY, RECITATION, PROHIBITED_CONTENT, ...) means
  // the output is incomplete or was blocked.
  const finishReason: string | undefined = data.candidates?.[0]?.finishReason;

  // Optionally surface grounding metadata (present only on grounded responses).
  // Capturing it never affects text extraction or the finishReason guard below.
  const groundingMetadata: unknown = data.candidates?.[0]?.groundingMetadata;

  if ((finishReason === 'STOP' || finishReason === undefined) && text) {
    return groundingMetadata !== undefined ? { text, groundingMetadata } : { text };
  }

  // No usable text, or a non-STOP stop reason: throw so retryOperation retries
  // and the failure lands in the job's error_message.
  if (!finishReason) {
    throw new Error('Gemini returned no usable text (empty response, no finishReason).');
  }
  if (finishReason === 'STOP') {
    // STOP but empty text — treat as an empty-response failure.
    throw new Error('Gemini stopped normally but returned no usable text.');
  }
  throw new Error(
    `Gemini stopped early: ${finishReason}` +
    (text ? ' (partial/blocked output discarded).' : ' (no output).')
  );
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
