import { describe, expect, it } from 'vitest';
import { createDefaultBriefListUiState, normalizeBriefListUiState } from '../../utils/briefListUiState';

describe('briefListUiState', () => {
  it('returns expected defaults', () => {
    const state = createDefaultBriefListUiState();

    expect(state).toEqual({
      activeTab: 'briefs',
      filterStatus: 'all',
      sortBy: 'smart',
      briefViewMode: 'smart',
      projectFilter: 'all',
    });
  });

  it('normalizes invalid values to defaults', () => {
    const normalized = normalizeBriefListUiState(
      {
        activeTab: 'invalid',
        filterStatus: 'invalid',
        sortBy: 'invalid',
        briefViewMode: 'invalid',
        projectFilter: '   ',
      } as unknown as Parameters<typeof normalizeBriefListUiState>[0]
    );

    expect(normalized).toEqual({
      activeTab: 'briefs',
      filterStatus: 'all',
      sortBy: 'smart',
      briefViewMode: 'smart',
      projectFilter: 'all',
    });
  });

  it('forces project filter to all when resetProjectFilter is true', () => {
    const normalized = normalizeBriefListUiState(
      {
        activeTab: 'articles',
        filterStatus: 'complete',
        sortBy: 'name',
        briefViewMode: 'grouped',
        projectFilter: 'project-123',
      },
      { resetProjectFilter: true },
    );

    expect(normalized).toEqual({
      activeTab: 'articles',
      filterStatus: 'complete',
      sortBy: 'name',
      briefViewMode: 'grouped',
      projectFilter: 'all',
    });
  });
});
