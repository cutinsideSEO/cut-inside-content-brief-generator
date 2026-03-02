import { describe, expect, it } from 'vitest';
import { getGenerationProgressModel, getGenerationStatusBadgeLabel } from '../../utils/generationActivity';

describe('generation activity helpers', () => {
  it('prefers realtime percentage when present', () => {
    const model = getGenerationProgressModel({
      status: 'generating_brief',
      generationStep: 2,
      jobProgress: {
        current_step: 2,
        total_steps: 7,
        step_name: 'Generating keyword strategy...',
        percentage: 73,
      },
    });

    expect(model.percentage).toBe(73);
    expect(model.label).toContain('Generating keyword strategy');
  });

  it('derives brief percentage from current_step/total_steps when percentage is missing', () => {
    const model = getGenerationProgressModel({
      status: 'generating_brief',
      generationStep: null,
      jobProgress: {
        current_step: 4,
        total_steps: 7,
      },
    });

    expect(model.percentage).toBe(57);
    expect(model.label).toContain('Step 4/7');
  });

  it('derives article percentage from current_index/total_sections when percentage is missing', () => {
    const model = getGenerationProgressModel({
      status: 'generating_content',
      generationStep: null,
      jobProgress: {
        current_section: 'Body section',
        current_index: 2,
        total_sections: 5,
      },
    });

    expect(model.percentage).toBe(40);
    expect(model.label).toContain('Section 2/5');
  });

  it('renders competitors phase details with counters', () => {
    const model = getGenerationProgressModel({
      status: 'analyzing_competitors',
      generationStep: null,
      jobProgress: {
        phase: 'onpage',
        completed_urls: 3,
        total_urls: 10,
      },
    });

    expect(model.label).toContain('Scraping Competitor Pages');
    expect(model.label).toContain('3/10');
  });

  it('falls back to legacy synthetic progress when realtime details are unavailable', () => {
    const model = getGenerationProgressModel({
      status: 'generating_brief',
      generationStep: 3,
      jobProgress: {},
    });

    expect(model.percentage).toBeCloseTo(45.71, 2);
    expect(model.label).toContain('Step 3/7');
  });

  it('provides consistent status badge labels across surfaces', () => {
    expect(getGenerationStatusBadgeLabel('analyzing_competitors')).toBe('Analyzing');
    expect(getGenerationStatusBadgeLabel('generating_brief')).toBe('Generating Brief');
    expect(getGenerationStatusBadgeLabel('generating_content')).toBe('Generating Article');
    expect(getGenerationStatusBadgeLabel('idle')).toBe('Idle');
  });
});
