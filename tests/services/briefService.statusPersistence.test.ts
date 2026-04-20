import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentBrief } from '../../types';

let capturedUpdates: Record<string, unknown> | null = null;

const singleMock = vi.fn(async () => ({ data: {}, error: null }));
const selectMock = vi.fn(() => ({ single: singleMock }));
const eqMock = vi.fn(() => ({ select: selectMock }));
const updateMock = vi.fn((updates: Record<string, unknown>) => {
  capturedUpdates = updates;
  return { eq: eqMock };
});
const fromMock = vi.fn(() => ({ update: updateMock }));

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: fromMock,
  },
}));

const fullBriefData: Partial<ContentBrief> = {
  page_goal: { value: 'Goal', reasoning: 'Reasoning' },
  target_audience: { value: 'Audience', reasoning: 'Reasoning' },
  keyword_strategy: { primary_keywords: [], secondary_keywords: [], reasoning: 'Reasoning' },
  competitor_insights: {
    competitor_breakdown: [],
    differentiation_summary: { value: 'x', reasoning: 'y' },
  },
  content_gap_analysis: { table_stakes: [], strategic_opportunities: [], reasoning: 'Reasoning' },
  article_structure: { word_count_target: 1200, outline: [], reasoning: 'Reasoning' },
  faqs: { questions: [], reasoning: 'Reasoning' },
  on_page_seo: {
    title_tag: { value: 'Title', reasoning: 'Reasoning' },
    meta_description: { value: 'Description', reasoning: 'Reasoning' },
    h1: { value: 'Heading', reasoning: 'Reasoning' },
    url_slug: { value: 'slug', reasoning: 'Reasoning' },
    og_title: { value: 'OG Title', reasoning: 'Reasoning' },
    og_description: { value: 'OG Description', reasoning: 'Reasoning' },
  },
};

const partialBriefData: Partial<ContentBrief> = {
  page_goal: { value: 'Goal', reasoning: 'Reasoning' },
  target_audience: { value: 'Audience', reasoning: 'Reasoning' },
  competitor_insights: {
    competitor_breakdown: [],
    differentiation_summary: { value: 'x', reasoning: 'y' },
  },
};

describe('briefService terminal persistence', () => {
  beforeEach(() => {
    capturedUpdates = null;
    singleMock.mockClear();
    selectMock.mockClear();
    eqMock.mockClear();
    updateMock.mockClear();
    fromMock.mockClear();
  });

  it('computes complete for a fully generated brief even when current view is stale', async () => {
    const { computeBriefStatus } = await import('../../services/briefService');

    expect(computeBriefStatus('initial_input', fullBriefData)).toBe('complete');
  });

  it('treats partial generated data with stale initial view as in progress', async () => {
    const { computeBriefStatus, normalizeBriefPersistenceState } = await import('../../services/briefService');

    expect(computeBriefStatus('initial_input', partialBriefData, 4)).toBe('in_progress');
    expect(normalizeBriefPersistenceState({
      currentView: 'initial_input',
      currentStep: 4,
      briefData: partialBriefData,
      currentStatus: 'in_progress',
    })).toEqual({
      currentView: 'dashboard',
      currentStep: 4,
      status: 'in_progress',
      isTerminal: false,
    });
  });

  it('normalizes stale terminal briefs to dashboard and complete', async () => {
    const { normalizeBriefPersistenceState } = await import('../../services/briefService');

    expect(normalizeBriefPersistenceState({
      currentView: 'initial_input',
      currentStep: 7,
      briefData: fullBriefData,
      currentStatus: 'draft',
    })).toEqual({
      currentView: 'dashboard',
      currentStep: 7,
      status: 'complete',
      isTerminal: true,
    });
  });

  it('preserves workflow statuses while normalizing stale terminal views', async () => {
    const { normalizeBriefPersistenceState } = await import('../../services/briefService');

    expect(normalizeBriefPersistenceState({
      currentView: 'initial_input',
      currentStep: 7,
      briefData: fullBriefData,
      currentStatus: 'approved',
    })).toEqual({
      currentView: 'dashboard',
      currentStep: 7,
      status: 'approved',
      isTerminal: true,
    });
  });

  it('writes normalized dashboard/complete state during save instead of regressing to draft', async () => {
    const { saveBriefState } = await import('../../services/briefService');

    await saveBriefState('brief-1', {
      current_view: 'initial_input',
      current_step: 7,
      brief_data: fullBriefData,
    }, 'draft');

    expect(capturedUpdates).toMatchObject({
      current_view: 'dashboard',
      current_step: 7,
      status: 'complete',
    });
  });

  it('keeps workflow status while still repairing stale terminal view during save', async () => {
    const { saveBriefState } = await import('../../services/briefService');

    await saveBriefState('brief-2', {
      current_view: 'initial_input',
      current_step: 7,
      brief_data: fullBriefData,
    }, 'approved');

    expect(capturedUpdates).toMatchObject({
      current_view: 'dashboard',
      current_step: 7,
    });
    expect(capturedUpdates).not.toHaveProperty('status');
  });

  it('writes dashboard view for stale partial progress instead of regressing to initial input', async () => {
    const { saveBriefState } = await import('../../services/briefService');

    await saveBriefState('brief-3', {
      current_view: 'initial_input',
      current_step: 4,
      brief_data: partialBriefData,
    }, 'in_progress');

    expect(capturedUpdates).toMatchObject({
      current_view: 'dashboard',
      current_step: 4,
      status: 'in_progress',
    });
  });
});
