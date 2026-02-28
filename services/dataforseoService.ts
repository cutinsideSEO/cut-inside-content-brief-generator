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

/**
 * Proxy on-page elements request through Supabase Edge Function.
 * Used in Supabase mode to avoid exposing DataForSEO credentials to the frontend.
 */
export async function getOnPageElementsViaProxy(url: string): Promise<{
    H1s: string[];
    H2s: string[];
    H3s: string[];
    Word_Count: number;
    Full_Text: string;
}> {
    // Dynamic import to avoid circular dependency at module level
    const { supabase } = await import('./supabaseClient');
    const { getCurrentUserId } = await import('./authService');

    const { data, error } = await supabase.functions.invoke('dataforseo-proxy', {
        body: {
            action: 'on_page_elements',
            url,
            user_id: getCurrentUserId(),
        },
    });

    if (error) {
        throw new Error(`DataForSEO proxy error: ${error.message}`);
    }

    if (!data?.data) {
        throw new Error('No on-page data returned from proxy');
    }

    // The proxy returns a single OnPageElements object from getOnPageElements
    return data.data;
}
