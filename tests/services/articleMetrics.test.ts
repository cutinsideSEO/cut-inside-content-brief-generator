import { describe, expect, it } from 'vitest';
import { countArticleWords } from '../../utils/articleMetrics';

describe('countArticleWords', () => {
  it('returns 0 for empty or whitespace-only content', () => {
    expect(countArticleWords('')).toBe(0);
    expect(countArticleWords('   \n  \t ')).toBe(0);
  });

  it('counts plain words split on whitespace', () => {
    expect(countArticleWords('one two three')).toBe(3);
    expect(countArticleWords('  leading and trailing  ')).toBe(3);
  });

  it('does not count markdown syntax tokens as words', () => {
    // Heading hashes, bold/italic markers, and list bullets should be stripped
    // before counting so they do not inflate the total.
    const md = [
      '# Heading One',
      '',
      'Some **bold** and *italic* text.',
      '',
      '- bullet one',
      '- bullet two',
    ].join('\n');
    // Words: Heading, One, Some, bold, and, italic, text, bullet, one, bullet, two = 11
    expect(countArticleWords(md)).toBe(11);
  });

  it('counts link text but not the URL', () => {
    expect(countArticleWords('See [the docs](https://example.com/path) now')).toBe(4);
  });
});
