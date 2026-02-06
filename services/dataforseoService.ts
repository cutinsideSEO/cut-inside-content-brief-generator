// A service to interact with the DataForSEO API

const API_BASE_URL = "https://api.dataforseo.com/v3";

// Track active request controllers for cancellation support
const activeControllers = new Set<AbortController>();

/**
 * Abort all in-flight DataForSEO requests (e.g., when user navigates away)
 */
export const abortAllRequests = () => {
    activeControllers.forEach(c => c.abort());
    activeControllers.clear();
};

/**
 * Fetch with timeout and abort tracking
 */
const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> => {
    const controller = new AbortController();
    activeControllers.add(controller);

    // If the caller already provided a signal, listen to it
    if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
    }

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => {
            clearTimeout(timeoutId);
            activeControllers.delete(controller);
        });
};

const executePost = async (endpoint: string, payload: any[], login: string, password: string) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + btoa(`${login}:${password}`),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
    }

    const data = await response.json();

    if (data.status_code !== 20000 || data.tasks_error > 0) {
        throw new Error(`DataForSEO task error: ${data.tasks[0]?.status_message}`);
    }

    return data;
};


export interface SerpResult {
    url: string;
    rank: number;
}

export interface SerpResponse {
    urls: SerpResult[];
    paaQuestions: string[];
}

export const getSerpUrls = async (keyword: string, login: string, password: string, country: string, language: string): Promise<SerpResponse> => {
    const payload = [{
        language_name: language,
        location_name: country,
        keyword: keyword,
        depth: 20 // Search deeper to ensure we get 10 organic results
    }];

    const data = await executePost("serp/google/organic/live/regular", payload, login, password);

    if (data.tasks_count > 0 && data.tasks[0].status_code === 20000 && data.tasks[0].result) {
        const result = data.tasks[0].result[0];
        const items = result.items || [];

        // Extract organic results
        const organicResults = items
            .filter((item: any) => item.type === 'organic')
            .slice(0, 10);

        const urls = organicResults
            .map((item: any) => ({ url: item.url, rank: item.rank_absolute }))
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
};


export const getDetailedOnpageElements = async (url: string, login: string, password: string) => {
    const payload = [{
        url: url,
        enable_javascript: true
    }];

    const data = await executePost("on_page/content_parsing/live", payload, login, password);
    
    const errorResult = { H1s: ["PARSE_FAILED"], H2s: [], H3s: [], Word_Count: 0, Full_Text: "Could not parse the JSON response." };

    if (data.tasks_count > 0 && data.tasks[0].status_code === 20000 && data.tasks[0].result) {
        const pageContent = data.tasks[0].result[0]?.items?.[0]?.page_content;
        if (pageContent) {
            const h1s: string[] = [];
            const h2s: string[] = [];
            const h3s: string[] = [];
            const allTextChunks: string[] = [];

            const mainTopics = pageContent.main_topic || [];
            mainTopics.forEach((topic: any) => {
                const { level, h_title } = topic;
                if (h_title) {
                    if (level === 1) h1s.push(h_title);
                    else if (level === 2) h2s.push(h_title);
                    else if (level === 3) h3s.push(h_title);
                }
                const primaryContent = topic.primary_content || [];
                primaryContent.forEach((contentItem: any) => {
                    if (contentItem?.text) {
                        allTextChunks.push(contentItem.text);
                    }
                });
            });

            const fullText = allTextChunks.join(' ');
            const cleanText = fullText.replace(/\s+/g, ' ').trim();

            return {
                H1s: h1s.length > 0 ? h1s : ["No H1 Found"],
                H2s: h2s,
                H3s: h3s,
                Word_Count: cleanText.split(' ').length,
                Full_Text: cleanText,
            };
        }
    }

    return errorResult;
};
