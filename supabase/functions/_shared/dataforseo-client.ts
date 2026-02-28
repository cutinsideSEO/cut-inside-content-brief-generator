// Direct DataForSEO API client for Edge Functions
// Credentials read from Deno environment variables (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD)

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { retryOperation } from './gemini-client.ts';

const API_BASE_URL = 'https://api.dataforseo.com/v3';

// ============================================
// Types
// ============================================

export interface SerpResult {
  url: string;
  rank: number;
}

export interface SerpResponse {
  urls: SerpResult[];
  paaQuestions: string[];
}

export interface OnPageElements {
  H1s: string[];
  H2s: string[];
  H3s: string[];
  Word_Count: number;
  Full_Text: string;
}

// ============================================
// Helpers
// ============================================

/**
 * Returns Base64-encoded DataForSEO credentials from environment variables.
 * Throws if either DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD is not set.
 */
function getAuthHeader(): string {
  const login = Deno.env.get('DATAFORSEO_LOGIN');
  const password = Deno.env.get('DATAFORSEO_PASSWORD');

  if (!login || !password) {
    throw new Error(
      'DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables are required'
    );
  }

  return 'Basic ' + btoa(`${login}:${password}`);
}

/**
 * Execute a POST request to the DataForSEO API.
 * Validates the top-level response (status_code, tasks_error) before returning.
 */
// deno-lint-ignore no-explicit-any
async function executePost(endpoint: string, payload: unknown[]): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `DataForSEO API error: ${response.status} ${response.statusText}. Details: ${errorBody}`
    );
  }

  const data = await response.json();

  if (data.status_code !== 20000 || data.tasks_error > 0) {
    throw new Error(
      `DataForSEO task error: ${data.tasks?.[0]?.status_message || 'Unknown error'}`
    );
  }

  return data;
}

// ============================================
// Public API
// ============================================

/**
 * Fetch SERP results for a keyword from DataForSEO.
 * Returns the top 10 organic URLs with their rank, plus People Also Ask questions.
 *
 * @param keyword - The search keyword
 * @param country - Location name (e.g., 'United States')
 * @param language - Language name (e.g., 'English')
 */
export async function getSerpUrls(
  keyword: string,
  country: string,
  language: string
): Promise<SerpResponse> {
  const payload = [
    {
      keyword,
      language_name: language,
      location_name: country,
      depth: 20, // Search deeper to ensure we get 10 organic results
    },
  ];

  const data = await executePost('serp/google/organic/live/regular', payload);

  if (
    data.tasks_count > 0 &&
    data.tasks[0].status_code === 20000 &&
    data.tasks[0].result
  ) {
    const result = data.tasks[0].result[0];
    const items = result.items || [];

    // Extract organic results — top 10
    const organicResults = items
      // deno-lint-ignore no-explicit-any
      .filter((item: any) => item.type === 'organic')
      .slice(0, 10);

    const urls: SerpResult[] = organicResults
      // deno-lint-ignore no-explicit-any
      .map((item: any) => ({ url: item.url, rank: item.rank_absolute }))
      // deno-lint-ignore no-explicit-any
      .filter((item: any) => item.url && typeof item.rank === 'number');

    // Extract People Also Ask questions
    const paaQuestions: string[] = [];
    for (const item of items) {
      if (item.type === 'people_also_ask') {
        const paaItems = item.items || [];
        for (const paaItem of paaItems) {
          if (paaItem.title) {
            paaQuestions.push(paaItem.title);
          }
        }
      }
    }

    return { urls, paaQuestions };
  }

  return { urls: [], paaQuestions: [] };
}

/**
 * Fetch on-page content elements (headings, word count, full text) for a URL.
 * Uses the DataForSEO content_parsing endpoint with JavaScript rendering enabled.
 *
 * @param url - The page URL to parse
 */
export async function getOnPageElements(url: string): Promise<OnPageElements> {
  const payload = [
    {
      url,
      enable_javascript: true,
    },
  ];

  const errorResult: OnPageElements = {
    H1s: [],
    H2s: [],
    H3s: [],
    Word_Count: 0,
    Full_Text: '',
  };

  const data = await executePost('on_page/content_parsing/live', payload);

  if (
    data.tasks_count > 0 &&
    data.tasks[0].status_code === 20000 &&
    data.tasks[0].result
  ) {
    const pageContent = data.tasks[0].result[0]?.items?.[0]?.page_content;

    if (pageContent) {
      const h1s: string[] = [];
      const h2s: string[] = [];
      const h3s: string[] = [];
      const allTextChunks: string[] = [];

      const mainTopics = pageContent.main_topic || [];
      // deno-lint-ignore no-explicit-any
      mainTopics.forEach((topic: any) => {
        const { level, h_title } = topic;
        if (h_title) {
          if (level === 1) h1s.push(h_title);
          else if (level === 2) h2s.push(h_title);
          else if (level === 3) h3s.push(h_title);
        }
        const primaryContent = topic.primary_content || [];
        // deno-lint-ignore no-explicit-any
        primaryContent.forEach((contentItem: any) => {
          if (contentItem?.text) {
            allTextChunks.push(contentItem.text);
          }
        });
      });

      const fullText = allTextChunks.join(' ');
      const cleanText = fullText.replace(/\s+/g, ' ').trim();

      return {
        H1s: h1s.length > 0 ? h1s : ['No H1 Found'],
        H2s: h2s,
        H3s: h3s,
        Word_Count: cleanText ? cleanText.split(' ').length : 0,
        Full_Text: cleanText,
      };
    }
  }

  return errorResult;
}
