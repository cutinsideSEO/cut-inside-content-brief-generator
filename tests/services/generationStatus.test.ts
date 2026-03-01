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
    it('marks complete only for full_brief jobs', () => {
      expect(shouldMarkBriefCompleteOnJobCompletion('full_brief')).toBe(true);
      expect(shouldMarkBriefCompleteOnJobCompletion('article')).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion('regenerate')).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion('competitors')).toBe(false);
      expect(shouldMarkBriefCompleteOnJobCompletion(undefined)).toBe(false);
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
