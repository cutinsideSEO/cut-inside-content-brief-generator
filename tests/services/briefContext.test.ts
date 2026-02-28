import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  countWords,
  estimateTokens,
  checkTokenBudget,
  stripCompetitorFullText,
  truncateCompetitorText,
  buildBrandContext,
  mergeBrandContext,
  formatForBriefGeneration,
  stripReasoningFromBrief,
} from '../../supabase/functions/_shared/brief-context';
import type { CompetitorPage, ClientBrandData, ContextFileData, ContextUrlData } from '../../supabase/functions/_shared/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCompetitor(overrides: Partial<CompetitorPage> = {}): CompetitorPage {
  return {
    URL: 'https://example.com',
    Weighted_Score: 1,
    rankings: [],
    H1s: [],
    H2s: [],
    H3s: [],
    Word_Count: 100,
    Full_Text: 'This is the full text content of the competitor page.',
    ...overrides,
  };
}

function makeClient(overrides: Partial<ClientBrandData> = {}): ClientBrandData {
  return {
    brand_identity: {},
    brand_voice: {},
    target_audience: {},
    content_strategy: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// countWords
// ---------------------------------------------------------------------------

describe('countWords', () => {
  it('counts words correctly for a simple sentence', () => {
    expect(countWords('hello world foo')).toBe(3);
  });

  it('returns 0 for an empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for a whitespace-only string', () => {
    expect(countWords('   \t\n  ')).toBe(0);
  });

  it('handles multiple spaces between words', () => {
    expect(countWords('one   two     three')).toBe(3);
  });

  it('counts a single word correctly', () => {
    expect(countWords('hello')).toBe(1);
  });

  it('handles leading and trailing spaces', () => {
    expect(countWords('  hello world  ')).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// estimateTokens
// ---------------------------------------------------------------------------

describe('estimateTokens', () => {
  it('returns ceiling of char length divided by 4', () => {
    // 8 chars → 2 tokens
    expect(estimateTokens('12345678')).toBe(2);
    // 9 chars → ceil(9/4) = 3 tokens
    expect(estimateTokens('123456789')).toBe(3);
  });

  it('returns 0 for an empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('approximates ~1 token per 4 characters', () => {
    const text = 'a'.repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// checkTokenBudget
// ---------------------------------------------------------------------------

describe('checkTokenBudget', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false and logs nothing when under warn limit', () => {
    // 40 chars → 10 tokens, warnAt=50, hardLimit=100
    const text = 'a'.repeat(40);
    const result = checkTokenBudget('test', text, 50, 100);

    expect(result).toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('returns false and logs a warning when between warn limit and hard limit', () => {
    // 300 chars → 75 tokens, warnAt=50, hardLimit=100
    const text = 'a'.repeat(300);
    const result = checkTokenBudget('test', text, 50, 100);

    expect(result).toBe(false);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('returns true and logs an error when over hard limit', () => {
    // 500 chars → 125 tokens, warnAt=50, hardLimit=100
    const text = 'a'.repeat(500);
    const result = checkTokenBudget('test', text, 50, 100);

    expect(result).toBe(true);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('uses default thresholds (warnAt=200000, hardLimit=900000)', () => {
    // short text — should not trigger anything
    const result = checkTokenBudget('label', 'short text');

    expect(result).toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// stripCompetitorFullText
// ---------------------------------------------------------------------------

describe('stripCompetitorFullText', () => {
  it('removes Full_Text from every competitor entry', () => {
    const competitors = [
      makeCompetitor({ URL: 'https://a.com', Full_Text: 'lots of text here' }),
      makeCompetitor({ URL: 'https://b.com', Full_Text: 'more text here' }),
    ];

    const result = stripCompetitorFullText(competitors);

    expect(result).toHaveLength(2);
    result.forEach(c => {
      expect(c).not.toHaveProperty('Full_Text');
    });
  });

  it('preserves all other fields on each competitor', () => {
    const competitor = makeCompetitor({
      URL: 'https://example.com',
      Weighted_Score: 42,
      Word_Count: 1500,
      H1s: ['Main heading'],
      H2s: ['Section one'],
      H3s: [],
      rankings: [{ keyword: 'kw', rank: 1, volume: 1000 }],
      is_starred: true,
      Full_Text: 'should be stripped',
    });

    const [result] = stripCompetitorFullText([competitor]);

    expect(result.URL).toBe('https://example.com');
    expect(result.Weighted_Score).toBe(42);
    expect(result.Word_Count).toBe(1500);
    expect(result.H1s).toEqual(['Main heading']);
    expect(result.is_starred).toBe(true);
  });

  it('returns an empty array when passed an empty array', () => {
    expect(stripCompetitorFullText([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// truncateCompetitorText
// ---------------------------------------------------------------------------

describe('truncateCompetitorText', () => {
  it('returns input unchanged when under token budget', () => {
    const competitors = [makeCompetitor({ Full_Text: 'short' })];
    const json = JSON.stringify(competitors);
    // json is well under default 150000 tokens
    expect(truncateCompetitorText(json)).toBe(json);
  });

  it('returns input unchanged when exactly at token budget', () => {
    // 100 tokens × 4 chars = 400 chars → 100 tokens, budget=100
    const tiny = [{ Full_Text: 'a'.repeat(100) }];
    const json = JSON.stringify(tiny); // slightly over 100 chars but let's use custom budget
    const result = truncateCompetitorText(JSON.stringify(tiny), estimateTokens(JSON.stringify(tiny)));
    expect(result).toBe(JSON.stringify(tiny));
  });

  it('truncates Full_Text proportionally when over budget', () => {
    // Build a string that will definitely exceed a tiny maxTokens budget
    const longText = 'a'.repeat(2000);
    const competitors = [makeCompetitor({ Full_Text: longText })];
    const json = JSON.stringify(competitors);

    // Set a tiny maxTokens so truncation always triggers
    const result = truncateCompetitorText(json, 10);
    const parsed = JSON.parse(result);

    expect(parsed[0].Full_Text).toContain('... [truncated]');
    expect(parsed[0].Full_Text.length).toBeLessThan(longText.length);
  });

  it('preserves non-Full_Text fields after truncation', () => {
    const longText = 'b'.repeat(2000);
    const competitors = [makeCompetitor({ URL: 'https://keep.me', Full_Text: longText })];
    const json = JSON.stringify(competitors);

    const result = truncateCompetitorText(json, 10);
    const parsed = JSON.parse(result);

    expect(parsed[0].URL).toBe('https://keep.me');
  });

  it('falls back to raw slice when JSON is invalid', () => {
    const invalid = 'not valid json ' + 'x'.repeat(200);
    // Budget of 1 token (4 chars) forces truncation
    const result = truncateCompetitorText(invalid, 1);
    // Falls back to json.slice(0, maxTokens * 4) = slice(0, 4)
    expect(result).toBe(invalid.slice(0, 4));
  });
});

// ---------------------------------------------------------------------------
// buildBrandContext
// ---------------------------------------------------------------------------

describe('buildBrandContext', () => {
  it('returns empty string when all brand data objects are empty', () => {
    const client = makeClient();
    expect(buildBrandContext(client)).toBe('');
  });

  it('includes brand identity section when brand_name is provided', () => {
    const client = makeClient({
      brand_identity: { brand_name: 'Acme Corp' },
    });
    const result = buildBrandContext(client);

    expect(result).toContain('Brand Identity');
    expect(result).toContain('Acme Corp');
  });

  it('includes tagline and positioning in brand identity', () => {
    const client = makeClient({
      brand_identity: {
        tagline: 'Just do it',
        positioning: 'Market leader in sports',
        industry: 'technology',
      },
    });
    const result = buildBrandContext(client);

    expect(result).toContain('Just do it');
    expect(result).toContain('Market leader in sports');
    expect(result).toContain('Technology'); // industry label lookup
  });

  it('includes brand voice section when tone descriptors are provided', () => {
    const client = makeClient({
      brand_voice: {
        tone_descriptors: ['professional', 'bold'],
        writing_style: 'concise',
      },
    });
    const result = buildBrandContext(client);

    expect(result).toContain('Brand Voice');
    expect(result).toContain('Professional');
    expect(result).toContain('Bold');
    expect(result).toContain('Concise');
  });

  it('includes target audience section when audience data is provided', () => {
    const client = makeClient({
      target_audience: {
        audience_type: 'b2b',
        demographics: 'Mid-size companies',
        job_titles: ['CTO', 'VP Engineering'],
      },
    });
    const result = buildBrandContext(client);

    expect(result).toContain('Target Audience');
    expect(result).toContain('B2B');
    expect(result).toContain('CTO');
  });

  it('includes content strategy section when dos/donts are provided', () => {
    const client = makeClient({
      content_strategy: {
        content_dos: ['Use active voice'],
        content_donts: ['Avoid jargon'],
        banned_terms: ['synergy'],
        preferred_terms: ['collaboration'],
      },
    });
    const result = buildBrandContext(client);

    expect(result).toContain('Content Strategy');
    expect(result).toContain('Use active voice');
    expect(result).toContain('Avoid jargon');
    expect(result).toContain('synergy');
    expect(result).toContain('collaboration');
  });

  it('includes context files when parse_status is done and parsed_content exists', () => {
    const client = makeClient({ brand_identity: { brand_name: 'X' } });
    const files: ContextFileData[] = [
      {
        file_name: 'brand-guide.pdf',
        description: 'Brand Guidelines',
        parsed_content: 'This is the brand guide content.',
        parse_status: 'done',
      },
    ];

    const result = buildBrandContext(client, files);

    expect(result).toContain('Brand Reference Documents');
    expect(result).toContain('Brand Guidelines');
    expect(result).toContain('brand guide content');
  });

  it('excludes context files when parse_status is not done', () => {
    const client = makeClient({ brand_identity: { brand_name: 'X' } });
    const files: ContextFileData[] = [
      {
        file_name: 'pending.pdf',
        description: null,
        parsed_content: 'Some content',
        parse_status: 'pending',
      },
    ];

    const result = buildBrandContext(client, files);
    expect(result).not.toContain('Brand Reference Documents');
  });

  it('truncates context file content at 1500 chars and adds truncation marker', () => {
    const longContent = 'x'.repeat(2000);
    const client = makeClient({ brand_identity: { brand_name: 'X' } });
    const files: ContextFileData[] = [
      {
        file_name: 'big-file.pdf',
        description: null,
        parsed_content: longContent,
        parse_status: 'done',
      },
    ];

    const result = buildBrandContext(client, files);
    expect(result).toContain('... [truncated]');
  });

  it('includes context URLs when scrape_status is done and scraped_content exists', () => {
    const client = makeClient({ brand_identity: { brand_name: 'X' } });
    const urls: ContextUrlData[] = [
      {
        url: 'https://example.com/about',
        label: 'About Page',
        scraped_content: 'We are a great company.',
        scrape_status: 'done',
      },
    ];

    const result = buildBrandContext(client, undefined, urls);

    expect(result).toContain('Brand Reference URLs');
    expect(result).toContain('About Page');
    expect(result).toContain('We are a great company');
  });

  it('excludes context URLs when scrape_status is not done', () => {
    const client = makeClient({ brand_identity: { brand_name: 'X' } });
    const urls: ContextUrlData[] = [
      {
        url: 'https://example.com',
        label: null,
        scraped_content: 'Some content',
        scrape_status: 'pending',
      },
    ];

    const result = buildBrandContext(client, undefined, urls);
    expect(result).not.toContain('Brand Reference URLs');
  });
});

// ---------------------------------------------------------------------------
// mergeBrandContext
// ---------------------------------------------------------------------------

describe('mergeBrandContext', () => {
  it('returns empty string when both inputs are empty', () => {
    expect(mergeBrandContext('', '')).toBe('');
    expect(mergeBrandContext('', undefined)).toBe('');
  });

  it('returns briefLevelBrandInfo alone when clientContext is empty', () => {
    expect(mergeBrandContext('', 'extra info')).toBe('extra info');
  });

  it('returns clientContext alone when briefLevelBrandInfo is empty or whitespace', () => {
    expect(mergeBrandContext('client context', '')).toBe('client context');
    expect(mergeBrandContext('client context', '   ')).toBe('client context');
    expect(mergeBrandContext('client context', undefined)).toBe('client context');
  });

  it('merges both contexts with a Brief-Specific Notes header', () => {
    const result = mergeBrandContext('Client level context', 'Brief specific notes');

    expect(result).toContain('Client level context');
    expect(result).toContain('Brief-Specific Notes');
    expect(result).toContain('Brief specific notes');
  });

  it('puts client context before brief-level context', () => {
    const result = mergeBrandContext('FIRST', 'SECOND');
    const firstIdx = result.indexOf('FIRST');
    const secondIdx = result.indexOf('SECOND');

    expect(firstIdx).toBeLessThan(secondIdx);
  });
});

// ---------------------------------------------------------------------------
// formatForBriefGeneration
// ---------------------------------------------------------------------------

describe('formatForBriefGeneration', () => {
  it('returns empty string for empty input', () => {
    expect(formatForBriefGeneration('')).toBe('');
  });

  it('returns input unchanged when under 28000 chars', () => {
    const input = 'a'.repeat(1000);
    expect(formatForBriefGeneration(input)).toBe(input);
  });

  it('returns input unchanged at exactly 28000 chars', () => {
    const input = 'a'.repeat(28000);
    expect(formatForBriefGeneration(input)).toBe(input);
  });

  it('truncates at 28000 chars and appends truncation marker when over limit', () => {
    const input = 'a'.repeat(30000);
    const result = formatForBriefGeneration(input);

    expect(result).toContain('... [brand context truncated for token budget]');
    // First 28000 chars preserved, then the marker
    expect(result.startsWith('a'.repeat(28000))).toBe(true);
    expect(result.length).toBeLessThan(input.length);
  });
});

// ---------------------------------------------------------------------------
// stripReasoningFromBrief
// ---------------------------------------------------------------------------

describe('stripReasoningFromBrief', () => {
  it('removes top-level reasoning fields', () => {
    const brief = {
      page_goal: { value: 'Educate readers', reasoning: 'should be stripped' },
    };

    const result = stripReasoningFromBrief(brief);
    expect((result.page_goal as Record<string, unknown>).reasoning).toBeUndefined();
    expect((result.page_goal as Record<string, unknown>).value).toBe('Educate readers');
  });

  it('removes deeply nested reasoning fields', () => {
    const brief = {
      keyword_strategy: {
        primary_keywords: [{ keyword: 'seo tips', notes: 'main keyword', reasoning: 'strip me' }],
        secondary_keywords: [],
        reasoning: 'also strip',
      },
    };

    const result = stripReasoningFromBrief(brief as Parameters<typeof stripReasoningFromBrief>[0]);
    const ks = result.keyword_strategy!;
    expect(ks.reasoning).toBeUndefined();
    expect((ks.primary_keywords[0] as Record<string, unknown>).reasoning).toBeUndefined();
    expect((ks.primary_keywords[0] as Record<string, unknown>).keyword).toBe('seo tips');
  });

  it('preserves non-reasoning fields at all depths', () => {
    const brief = {
      page_goal: { value: 'kept', reasoning: 'removed' },
      faqs: { questions: [{ question: 'Q1', guidelines: ['g1'] }], reasoning: 'removed' },
    };

    const result = stripReasoningFromBrief(brief as Parameters<typeof stripReasoningFromBrief>[0]);
    expect((result.page_goal as Record<string, unknown>).value).toBe('kept');
    expect(result.faqs!.questions[0].question).toBe('Q1');
    expect(result.faqs!.reasoning).toBeUndefined();
  });

  it('returns a deep copy and does not mutate the original', () => {
    const brief = { page_goal: { value: 'original', reasoning: 'will be stripped' } };
    const original = JSON.parse(JSON.stringify(brief));

    stripReasoningFromBrief(brief as Parameters<typeof stripReasoningFromBrief>[0]);

    expect(brief).toEqual(original); // original unchanged
  });
});
