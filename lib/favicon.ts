import type { BrandIdentity } from '../types/clientProfile';

/**
 * Returns the best available logo URL for a client:
 * 1. Manual logo_url from brand identity (highest priority)
 * 2. Google Favicon API from website field
 * 3. null (no logo available)
 */
export function getClientLogoUrl(brandIdentity?: BrandIdentity): string | null {
  if (!brandIdentity) return null;

  // Priority 1: Manually set logo URL
  if (brandIdentity.logo_url) return brandIdentity.logo_url;

  // Priority 2: Auto-detect from website via Google Favicon API
  if (brandIdentity.website) {
    try {
      const url = new URL(brandIdentity.website);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
    } catch {
      // Invalid URL — skip
    }
  }

  return null;
}
