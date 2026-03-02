import { describe, expect, it } from 'vitest';
import type { GeneratingBrief } from '../../types/generationActivity';
import { getActiveArticleGenerationItems } from '../../utils/articleGenerationActivity';

describe('article generation activity helpers', () => {
  it('returns only active article generation entries', () => {
    const generatingBriefs: Record<string, GeneratingBrief> = {
      'brief-a': {
        clientId: 'client-1',
        clientName: 'Client',
        status: 'generating_content',
        step: null,
      },
      'brief-b': {
        clientId: 'client-1',
        clientName: 'Client',
        status: 'generating_brief',
        step: 3,
      },
      'brief-c': {
        clientId: 'client-1',
        clientName: 'Client',
        status: 'idle',
        step: null,
      },
    };

    const items = getActiveArticleGenerationItems(generatingBriefs);
    expect(items.map((item) => item.briefId)).toEqual(['brief-a']);
  });

  it('sorts active article generation entries by newest updatedAt first', () => {
    const generatingBriefs: Record<string, GeneratingBrief> = {
      'brief-a': {
        clientId: 'client-1',
        clientName: 'Client',
        status: 'generating_content',
        step: null,
        updatedAt: '2026-03-02T10:00:00.000Z',
      },
      'brief-b': {
        clientId: 'client-1',
        clientName: 'Client',
        status: 'generating_content',
        step: null,
        updatedAt: '2026-03-02T11:00:00.000Z',
      },
    };

    const items = getActiveArticleGenerationItems(generatingBriefs);
    expect(items.map((item) => item.briefId)).toEqual(['brief-b', 'brief-a']);
  });
});
