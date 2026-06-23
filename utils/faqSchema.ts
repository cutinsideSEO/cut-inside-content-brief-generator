// Deterministic, client-side extraction of FAQ Q&A from generated article
// markdown, and construction of schema.org FAQPage JSON-LD. No AI calls.

export interface FaqQA {
  question: string;
  answer: string;
}

/**
 * Strip markdown inline formatting from a fragment, producing plain text
 * suitable for JSON-LD answer/question fields.
 */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/(\*\*|__)(.+?)\1/g, '$2') // bold
    .replace(/(\*|_)(.+?)\1/g, '$2') // italic
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/^#{1,6}\s+/, '') // any leading heading hashes
    .replace(/^>\s?/, '') // blockquote marker
    .replace(/^[-*+]\s+/, '') // list marker
    .replace(/^\d+\.\s+/, '') // ordered list marker
    .trim();
}

/** Collapse whitespace/newlines within an answer into clean spaced text. */
function normalizeAnswer(lines: string[]): string {
  return lines
    .map((line) => stripInlineMarkdown(line))
    .filter((line) => line.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;

/** Detect the FAQ section heading line (e.g. "## Frequently Asked Questions", "## FAQ"). */
function isFaqSectionHeading(headingText: string): boolean {
  const normalized = headingText.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return (
    normalized === 'faq' ||
    normalized === 'faqs' ||
    normalized.includes('frequently asked question')
  );
}

/**
 * Treat a line as a "question line" when it is either:
 *  - a markdown heading whose text ends with "?", or
 *  - a fully-bold line whose text ends with "?" (e.g. "**What is X?**").
 * Returns the cleaned question text, or null if not a question line.
 */
function asQuestionLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const headingMatch = trimmed.match(HEADING_RE);
  if (headingMatch) {
    const text = stripInlineMarkdown(headingMatch[2]);
    return text.endsWith('?') ? text : null;
  }

  // Fully-bold line acting as a question (no heading hashes).
  const boldMatch = trimmed.match(/^(\*\*|__)(.+?)\1[:：]?$/);
  if (boldMatch) {
    const text = stripInlineMarkdown(boldMatch[2]);
    return text.endsWith('?') ? text : null;
  }

  return null;
}

/** The heading level of a line, or 0 if it isn't a heading. */
function headingLevel(line: string): number {
  const m = line.trim().match(HEADING_RE);
  return m ? m[1].length : 0;
}

/**
 * Extract FAQ question/answer pairs from article markdown.
 *
 * Strategy (tolerant of formatting):
 * 1. Find the FAQ section heading ("## Frequently Asked Questions", "## FAQ", etc.).
 *    The FAQ subsection (## level) ends at the next heading of the same-or-shallower level.
 * 2. Within that section, each question is a heading line OR a fully-bold line ending in "?".
 *    Its answer is every following line until the next question or the section end.
 * 3. If no FAQ section heading exists, fall back to scanning the whole document for
 *    question-style headings followed by answer text (covers articles that emit
 *    questions without a wrapping "FAQ" heading).
 *
 * Returns [] when nothing usable is found (caller should hide/disable the action).
 */
export function extractFaqsFromArticle(markdown: string): FaqQA[] {
  if (!markdown || !markdown.trim()) return [];

  const lines = markdown.split('\n');

  // --- Locate the FAQ section, if any ---
  let sectionStart = -1;
  let sectionHeadingLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const lvl = headingLevel(lines[i]);
    if (lvl > 0) {
      const text = lines[i].trim().replace(HEADING_RE, '$2');
      if (isFaqSectionHeading(text)) {
        sectionStart = i + 1;
        sectionHeadingLevel = lvl;
        break;
      }
    }
  }

  let scanLines: string[];
  if (sectionStart >= 0) {
    // End the FAQ section at the next heading of same-or-shallower level.
    let sectionEnd = lines.length;
    for (let i = sectionStart; i < lines.length; i++) {
      const lvl = headingLevel(lines[i]);
      if (lvl > 0 && lvl <= sectionHeadingLevel) {
        sectionEnd = i;
        break;
      }
    }
    scanLines = lines.slice(sectionStart, sectionEnd);
  } else {
    // No FAQ heading — fall back to scanning the whole doc for question headings.
    scanLines = lines;
  }

  // --- Parse Q&A pairs ---
  const faqs: FaqQA[] = [];
  let currentQuestion: string | null = null;
  let currentAnswerLines: string[] = [];

  const flush = () => {
    if (currentQuestion) {
      const answer = normalizeAnswer(currentAnswerLines);
      if (answer) {
        faqs.push({ question: currentQuestion, answer });
      }
    }
    currentQuestion = null;
    currentAnswerLines = [];
  };

  for (const line of scanLines) {
    const question = asQuestionLine(line);
    if (question) {
      flush();
      currentQuestion = question;
      continue;
    }

    if (currentQuestion) {
      // A non-question heading inside an answer ends the current Q&A.
      if (headingLevel(line) > 0) {
        flush();
        continue;
      }
      currentAnswerLines.push(line);
    }
  }
  flush();

  return faqs;
}

export interface FaqPageJsonLd {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

/** Build a schema.org FAQPage JSON-LD object from extracted Q&A pairs. */
export function buildFaqPageJsonLd(faqs: FaqQA[]): FaqPageJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Convenience: parse article markdown and return a pretty-printed JSON-LD string,
 * or null when no FAQs are found.
 */
export function buildFaqSchemaStringFromArticle(markdown: string): string | null {
  const faqs = extractFaqsFromArticle(markdown);
  if (faqs.length === 0) return null;
  return JSON.stringify(buildFaqPageJsonLd(faqs), null, 2);
}
