import type { ContentBrief, LengthConstraints, OutlineItem } from '../types';

export interface SectionMetric {
  heading: string;
  level: string;
  actualWords: number;
  targetWords: number;
  percentage: number; // actual/target * 100
}

export interface KeywordMetric {
  keyword: string;
  count: number;
  density: number; // percentage of total words
  isPrimary: boolean;
}

export interface ArticleMetrics {
  wordCount: number;
  targetWordCount: number;
  wordCountPercentage: number; // actual/target * 100
  sectionBreakdown: SectionMetric[];
  missingSections: string[]; // headings from outline not found in article
  keywordMetrics: KeywordMetric[];
  avgSentenceLength: number;
  paragraphCount: number;
  headingCount: { h1: number; h2: number; h3: number };
}

/** Count words in text: split on whitespace, filter empty strings */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Strip markdown formatting from text for clean word counting */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/`(.+?)`/g, '$1') // inline code
    .replace(/^[-*+]\s+/gm, '') // list markers
    .replace(/^\d+\.\s+/gm, '') // numbered list markers
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/---+/g, '') // horizontal rules
    .trim();
}

/** Parse markdown into sections delimited by headings */
function parseSections(
  articleContent: string
): { heading: string; level: string; content: string }[] {
  const lines = articleContent.split('\n');
  const sections: { heading: string; level: string; content: string }[] = [];
  let currentHeading = '';
  let currentLevel = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      // Save previous section if it had a heading
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          content: currentLines.join('\n'),
        });
      }
      const hashes = headingMatch[1];
      currentLevel = `H${hashes.length}`;
      currentHeading = headingMatch[2].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Push the last section
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      content: currentLines.join('\n'),
    });
  }

  return sections;
}

/** Flatten outline items recursively into a flat list */
function flattenOutline(items: OutlineItem[]): OutlineItem[] {
  const result: OutlineItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children && item.children.length > 0) {
      result.push(...flattenOutline(item.children));
    }
  }
  return result;
}

/** Normalize a heading string for fuzzy comparison */
function normalizeHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/\*\*(.+?)\*\*/g, '$1') // strip bold
    .replace(/\*(.+?)\*/g, '$1') // strip italic
    .trim();
}

/** Calculate section breakdown by matching article sections to outline items */
function calculateSectionBreakdown(
  articleContent: string,
  brief: Partial<ContentBrief>,
  lengthConstraints?: LengthConstraints
): { sectionBreakdown: SectionMetric[]; missingSections: string[] } {
  const sections = parseSections(articleContent);
  const outlineItems = brief.article_structure?.outline
    ? flattenOutline(brief.article_structure.outline)
    : [];

  const sectionBreakdown: SectionMetric[] = [];
  const matchedOutlineHeadings = new Set<string>();

  for (const section of sections) {
    const sectionWords = countWords(stripMarkdown(section.content));
    const normalizedSectionHeading = normalizeHeading(section.heading);

    // Try to find matching outline item
    let targetWords = 0;
    const matchingOutline = outlineItems.find(
      (item) => normalizeHeading(item.heading) === normalizedSectionHeading
    );

    if (matchingOutline) {
      matchedOutlineHeadings.add(normalizeHeading(matchingOutline.heading));
      // Check lengthConstraints section targets first, then outline target
      if (lengthConstraints?.sectionTargets?.[matchingOutline.heading]) {
        targetWords = lengthConstraints.sectionTargets[matchingOutline.heading];
      } else if (matchingOutline.target_word_count) {
        targetWords = matchingOutline.target_word_count;
      }
    }

    sectionBreakdown.push({
      heading: section.heading,
      level: section.level,
      actualWords: sectionWords,
      targetWords,
      percentage: targetWords > 0 ? Math.round((sectionWords / targetWords) * 100) : 0,
    });
  }

  // Find missing sections: outline headings not present in the article
  const missingSections: string[] = [];
  for (const item of outlineItems) {
    if (!matchedOutlineHeadings.has(normalizeHeading(item.heading))) {
      missingSections.push(item.heading);
    }
  }

  return { sectionBreakdown, missingSections };
}

/** Count keyword occurrences in text (case-insensitive, whole word) */
function countKeywordOccurrences(text: string, keyword: string): number {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/** Calculate keyword metrics for all primary and secondary keywords */
function calculateKeywordMetrics(
  articleContent: string,
  brief: Partial<ContentBrief>,
  totalWords: number
): KeywordMetric[] {
  const metrics: KeywordMetric[] = [];
  const plainText = stripMarkdown(articleContent);

  const primaryKeywords = brief.keyword_strategy?.primary_keywords || [];
  const secondaryKeywords = brief.keyword_strategy?.secondary_keywords || [];

  for (const kw of primaryKeywords) {
    const count = countKeywordOccurrences(plainText, kw.keyword);
    metrics.push({
      keyword: kw.keyword,
      count,
      density: totalWords > 0 ? Math.round((count / totalWords) * 10000) / 100 : 0,
      isPrimary: true,
    });
  }

  for (const kw of secondaryKeywords) {
    const count = countKeywordOccurrences(plainText, kw.keyword);
    metrics.push({
      keyword: kw.keyword,
      count,
      density: totalWords > 0 ? Math.round((count / totalWords) * 10000) / 100 : 0,
      isPrimary: false,
    });
  }

  return metrics;
}

/** Calculate average sentence length in words */
function calculateAvgSentenceLength(text: string): number {
  const plainText = stripMarkdown(text);
  // Split on sentence-ending punctuation followed by space or end of string
  const sentences = plainText
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) return 0;

  const totalWords = sentences.reduce((sum, sentence) => sum + countWords(sentence), 0);
  return Math.round((totalWords / sentences.length) * 10) / 10;
}

/** Count paragraphs (blocks separated by blank lines) */
function countParagraphs(text: string): number {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0).length;
}

/** Count headings by level */
function countHeadings(text: string): { h1: number; h2: number; h3: number } {
  const lines = text.split('\n');
  let h1 = 0;
  let h2 = 0;
  let h3 = 0;

  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      h3++;
    } else if (/^##\s+/.test(line)) {
      h2++;
    } else if (/^#\s+/.test(line)) {
      h1++;
    }
  }

  return { h1, h2, h3 };
}

/**
 * Calculate all article metrics from content and brief data.
 * Pure utility — no AI calls, all calculations done in JavaScript.
 */
export function calculateArticleMetrics(
  articleContent: string,
  brief: Partial<ContentBrief>,
  lengthConstraints?: LengthConstraints
): ArticleMetrics {
  const plainText = stripMarkdown(articleContent);
  const wordCount = countWords(plainText);

  const targetWordCount =
    lengthConstraints?.globalTarget ||
    brief.article_structure?.word_count_target ||
    0;

  const wordCountPercentage =
    targetWordCount > 0 ? Math.round((wordCount / targetWordCount) * 100) : 0;

  const { sectionBreakdown, missingSections } = calculateSectionBreakdown(
    articleContent,
    brief,
    lengthConstraints
  );

  const keywordMetrics = calculateKeywordMetrics(articleContent, brief, wordCount);
  const avgSentenceLength = calculateAvgSentenceLength(articleContent);
  const paragraphCount = countParagraphs(articleContent);
  const headingCount = countHeadings(articleContent);

  return {
    wordCount,
    targetWordCount,
    wordCountPercentage,
    sectionBreakdown,
    missingSections,
    keywordMetrics,
    avgSentenceLength,
    paragraphCount,
    headingCount,
  };
}
