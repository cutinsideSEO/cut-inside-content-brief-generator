import { describe, it, expect } from 'vitest';
import { headingNodesToOutlineItems } from '../../services/templateExtractionService';
import type { HeadingNode } from '../../types';

describe('templateExtractionService', () => {
  // Note: extractHeadingsFromBrief has a complex regex that expects very specific format
  // Those tests are better suited for integration testing with real brief exports
  // Here we focus on the headingNodesToOutlineItems function which is well-defined

  describe('headingNodesToOutlineItems', () => {
    const sampleHeadings: HeadingNode[] = [
      {
        level: 2,
        text: 'Introduction',
        children: [
          { level: 3, text: 'Overview', children: [] },
          { level: 3, text: 'Background', children: [], guidelines: 'Provide context' },
        ],
      },
      {
        level: 2,
        text: 'Main Section',
        children: [],
        adaptedText: 'Adapted Main Section Title',
      },
      {
        level: 1,
        text: 'Hero Section',
        children: [
          { level: 2, text: 'Subsection', children: [] },
        ],
      },
    ];

    it('should convert HeadingNode to OutlineItem format', () => {
      const outlineItems = headingNodesToOutlineItems(sampleHeadings);

      expect(outlineItems.length).toBe(3);
      expect(outlineItems[0].level).toBe('H2');
      expect(outlineItems[0].heading).toBe('Introduction');
    });

    it('should convert H1 level correctly', () => {
      const outlineItems = headingNodesToOutlineItems(sampleHeadings);

      expect(outlineItems[2].level).toBe('H1');
      expect(outlineItems[2].heading).toBe('Hero Section');
    });

    it('should convert children recursively', () => {
      const outlineItems = headingNodesToOutlineItems(sampleHeadings);

      expect(outlineItems[0].children.length).toBe(2);
      expect(outlineItems[0].children[0].level).toBe('H3');
      expect(outlineItems[0].children[0].heading).toBe('Overview');
    });

    it('should handle deeply nested children', () => {
      const outlineItems = headingNodesToOutlineItems(sampleHeadings);

      expect(outlineItems[2].children.length).toBe(1);
      expect(outlineItems[2].children[0].level).toBe('H2');
    });

    it('should use adaptedText when available', () => {
      const outlineItems = headingNodesToOutlineItems(sampleHeadings);

      expect(outlineItems[1].heading).toBe('Adapted Main Section Title');
    });

    it('should fall back to text when adaptedText is not available', () => {
      const outlineItems = headingNodesToOutlineItems(sampleHeadings);

      expect(outlineItems[0].heading).toBe('Introduction');
    });

    it('should include guidelines as array when present', () => {
      const outlineItems = headingNodesToOutlineItems(sampleHeadings);

      expect(outlineItems[0].children[1].guidelines).toEqual(['Provide context']);
    });

    it('should have empty guidelines array when no guidelines', () => {
      const outlineItems = headingNodesToOutlineItems(sampleHeadings);

      expect(outlineItems[0].children[0].guidelines).toEqual([]);
    });

    it('should set default reasoning', () => {
      const outlineItems = headingNodesToOutlineItems(sampleHeadings);

      expect(outlineItems[0].reasoning).toBe('Pre-populated from template structure');
      expect(outlineItems[1].reasoning).toBe('Pre-populated from template structure');
    });

    it('should initialize empty arrays for keywords and coverage', () => {
      const outlineItems = headingNodesToOutlineItems(sampleHeadings);

      expect(outlineItems[0].targeted_keywords).toEqual([]);
      expect(outlineItems[0].competitor_coverage).toEqual([]);
      expect(outlineItems[0].additional_resources).toEqual([]);
    });

    it('should handle empty headings array', () => {
      const outlineItems = headingNodesToOutlineItems([]);

      expect(outlineItems).toEqual([]);
    });

    it('should handle headings with no children', () => {
      const simpleHeadings: HeadingNode[] = [
        { level: 2, text: 'Simple Heading', children: [] },
      ];
      const outlineItems = headingNodesToOutlineItems(simpleHeadings);

      expect(outlineItems[0].children).toEqual([]);
    });
  });
});
