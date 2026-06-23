import { describe, expect, it } from 'vitest';
import {
  extractFaqsFromArticle,
  buildFaqPageJsonLd,
  buildFaqSchemaStringFromArticle,
} from '../../utils/faqSchema';

describe('faqSchema', () => {
  describe('extractFaqsFromArticle', () => {
    it('parses the canonical generator format (## Frequently Asked Questions + ### questions)', () => {
      const md = [
        '# My Article',
        '',
        'Some intro paragraph.',
        '',
        '## Frequently Asked Questions',
        '',
        '### What is a NAS?',
        '',
        'A NAS is a network-attached storage device.',
        '',
        '### How much storage do I need?',
        '',
        'It depends on your usage. Most homes need 4-8TB.',
        '',
      ].join('\n');

      const faqs = extractFaqsFromArticle(md);
      expect(faqs).toEqual([
        { question: 'What is a NAS?', answer: 'A NAS is a network-attached storage device.' },
        {
          question: 'How much storage do I need?',
          answer: 'It depends on your usage. Most homes need 4-8TB.',
        },
      ]);
    });

    it('does not pull in content after the FAQ section ends (next ## heading)', () => {
      const md = [
        '## FAQ',
        '',
        '### Is it fast?',
        'Yes, very fast.',
        '',
        '## Conclusion',
        '',
        'This wraps things up. Not a question?',
      ].join('\n');

      const faqs = extractFaqsFromArticle(md);
      expect(faqs).toEqual([{ question: 'Is it fast?', answer: 'Yes, very fast.' }]);
    });

    it('strips markdown formatting from answers', () => {
      const md = [
        '## FAQs',
        '',
        '### What about **bold** and [links](https://example.com)?',
        '',
        'Use **bold text**, a [link](https://example.com), and `code` here.',
      ].join('\n');

      const faqs = extractFaqsFromArticle(md);
      expect(faqs).toHaveLength(1);
      expect(faqs[0].question).toBe('What about bold and links?');
      expect(faqs[0].answer).toBe('Use bold text, a link, and code here.');
    });

    it('joins multi-paragraph answers into a single plain-text string', () => {
      const md = [
        '## Frequently Asked Questions',
        '',
        '### Why two paragraphs?',
        '',
        'First paragraph here.',
        '',
        'Second paragraph here.',
      ].join('\n');

      const faqs = extractFaqsFromArticle(md);
      expect(faqs[0].answer).toBe('First paragraph here. Second paragraph here.');
    });

    it('tolerates bold-line questions (no heading hashes)', () => {
      const md = [
        '## FAQ',
        '',
        '**What is the return policy?**',
        '',
        'You can return within 30 days.',
      ].join('\n');

      const faqs = extractFaqsFromArticle(md);
      expect(faqs).toEqual([
        { question: 'What is the return policy?', answer: 'You can return within 30 days.' },
      ]);
    });

    it('falls back to scanning question-style headings when there is no FAQ section', () => {
      const md = [
        '# Guide',
        '',
        '## What is RAID?',
        '',
        'RAID combines multiple disks.',
        '',
        '## Setup steps',
        '',
        'Follow these steps to configure your array.',
      ].join('\n');

      const faqs = extractFaqsFromArticle(md);
      // Only the question-style heading is treated as a FAQ.
      expect(faqs).toEqual([{ question: 'What is RAID?', answer: 'RAID combines multiple disks.' }]);
    });

    it('returns [] for empty/whitespace input', () => {
      expect(extractFaqsFromArticle('')).toEqual([]);
      expect(extractFaqsFromArticle('   \n  ')).toEqual([]);
    });

    it('returns [] when there is no FAQ section and no question headings', () => {
      const md = [
        '# Article',
        '',
        '## Overview',
        '',
        'Just regular prose with no questions.',
        '',
        '## Details',
        '',
        'More prose.',
      ].join('\n');

      expect(extractFaqsFromArticle(md)).toEqual([]);
    });

    it('skips a question with an empty answer', () => {
      const md = [
        '## FAQ',
        '',
        '### Has an answer?',
        '',
        'Yes it does.',
        '',
        '### No answer yet?',
        '',
      ].join('\n');

      const faqs = extractFaqsFromArticle(md);
      expect(faqs).toEqual([{ question: 'Has an answer?', answer: 'Yes it does.' }]);
    });
  });

  describe('buildFaqPageJsonLd', () => {
    it('builds valid schema.org FAQPage structure', () => {
      const jsonLd = buildFaqPageJsonLd([
        { question: 'Q1?', answer: 'A1' },
        { question: 'Q2?', answer: 'A2' },
      ]);

      expect(jsonLd).toEqual({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Q1?',
            acceptedAnswer: { '@type': 'Answer', text: 'A1' },
          },
          {
            '@type': 'Question',
            name: 'Q2?',
            acceptedAnswer: { '@type': 'Answer', text: 'A2' },
          },
        ],
      });
    });
  });

  describe('buildFaqSchemaStringFromArticle', () => {
    it('returns a pretty-printed JSON-LD string for articles with FAQs', () => {
      const md = ['## FAQ', '', '### Works?', 'Yes.'].join('\n');
      const str = buildFaqSchemaStringFromArticle(md);
      expect(str).not.toBeNull();
      const parsed = JSON.parse(str as string);
      expect(parsed['@type']).toBe('FAQPage');
      expect(parsed.mainEntity).toHaveLength(1);
      expect(parsed.mainEntity[0].name).toBe('Works?');
      // Pretty-printed (contains newlines + indentation).
      expect(str).toContain('\n');
    });

    it('returns null when no FAQs are present', () => {
      const md = '# Article\n\nNo questions here.';
      expect(buildFaqSchemaStringFromArticle(md)).toBeNull();
    });
  });
});
