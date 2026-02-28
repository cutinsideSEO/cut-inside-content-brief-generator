// A service to interact with the DataForSEO API via Supabase proxy

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
