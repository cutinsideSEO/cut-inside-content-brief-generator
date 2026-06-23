import { describe, expect, it } from 'vitest';
import {
  getEffectiveBriefStatusForList,
  isBriefActivelyGenerating,
  shouldMarkBriefCompleteOnJobCompletion,
} from '../../utils/generationStatus';

describe('generation status helpers', () => {
  describe('isBriefActivelyGenerating', () => {
    it('returns true only for active generation statuses', () => {
      expect(isBriefActivelyGenerating('analyzing_competitors')).toBe(true);
      expect(isBriefActivelyGenerating('generating_brief')).toBe(true);
      expect(isBriefActivelyGenerating('generating_content')).toBe(true);
      expect(isBriefActivelyGenerating('idle')).toBe(false);
      expect(isBriefActivelyGenerating(undefined)).toBe(false);
    });
  });

  describe('shouldMarkBriefCompleteOnJobCompletion', () => {
    const allSections = {
      page_goal: { value: 'x' },
      target_audience: { value: 'x' },
      keyword_strategy: { value: 'x' },
      competitor_insights: { value: 'x' },
      content_gap_analysis: { value: 'x' },
      article_structure: { value: 'x' },
      faqs: { value: 'x' },
      on_page_seo: { value: 'x' },
    };

    it('never marks complete for non-full_brief jobs regardless of step', () => {
      expect(shouldMarkBriefCompleteOnJobCompletion('article', 7, allSections)).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion('regenerate', 7, allSections)).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion('competitors', 7, allSections)).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion(undefined, 7, allSections)).toBe(false);
    });

    it('does NOT mark complete for an intermediate full_brief step', () => {
      // EXECUTION_ORDER = [1, 3, 2, 4, 5, 6, 7] — anything before 7 is intermediate.
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief', 1)).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief', 3)).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief', 5)).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief', 6)).toBe(false);
    });

    it('marks complete for the FINAL full_brief step (step 7)', () => {
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief', 7)).toBe(true);
      // Final step should win even if briefData snapshot lags behind.
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief', 7, {})).toBe(true);
    });

    it('falls back to all-sections check when step_number is unavailable', () => {
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief', null, allSections)).toBe(true);
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief', undefined, allSections)).toBe(true);
      // Missing sections → not complete.
      expect(
        shouldMarkBriefCompleteOnJobCompletion('full_brief', null, { page_goal: { value: 'x' } }),
      ).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief', null)).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief')).toBe(false);
    });
  });

  describe('getEffectiveBriefStatusForList', () => {
    it('downgrades complete to in_progress when an active job still exists', () => {
      const status = getEffectiveBriefStatusForList({
        status: 'complete',
        current_step: 7,
        active_job_id: 'job-1',
        brief_data: {},
      });
      expect(status).toBe('in_progress');
    });

    it('downgrades complete to in_progress when current_step is below 7', () => {
      const status = getEffectiveBriefStatusForList({
        status: 'complete',
        current_step: 4,
        active_job_id: null,
        brief_data: {},
      });
      expect(status).toBe('in_progress');
    });

    it('downgrades complete to in_progress when required generated sections are missing', () => {
      const status = getEffectiveBriefStatusForList({
        status: 'complete',
        current_step: 7,
        active_job_id: null,
        brief_data: {
          page_goal: { value: 'x' },
          keyword_strategy: { value: 'x' },
        },
      });
      expect(status).toBe('in_progress');
    });

    it('keeps complete when current step and generated sections are present', () => {
      const status = getEffectiveBriefStatusForList({
        status: 'complete',
        current_step: 7,
        active_job_id: null,
        brief_data: {
          page_goal: { value: 'x' },
          target_audience: { value: 'x' },
          keyword_strategy: { value: 'x' },
          competitor_insights: { value: 'x' },
          content_gap_analysis: { value: 'x' },
          article_structure: { value: 'x' },
          faqs: { value: 'x' },
          on_page_seo: { value: 'x' },
        },
      });
      expect(status).toBe('complete');
    });

    it('preserves non-complete statuses', () => {
      expect(getEffectiveBriefStatusForList({
        status: 'approved',
        current_step: 7,
        active_job_id: null,
        brief_data: {},
      })).toBe('approved');
    });
  });
});
