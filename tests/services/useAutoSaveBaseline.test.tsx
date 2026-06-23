import { describe, it, expect, vi } from 'vitest';

// Keep the module graph free of Supabase/network side effects when importing the hook module.
vi.mock('../../services/briefService', () => ({ saveBriefState: vi.fn() }));
vi.mock('../../services/competitorService', () => ({ saveCompetitors: vi.fn() }));

import { buildAutoSaveData } from '../../hooks/useAutoSave';
import type { AutoSaveBaselineInput } from '../../hooks/useAutoSave';

/**
 * BUG 2 — redundant write-back of a just-loaded brief on open.
 *
 * The fix seeds the auto-save baseline (`lastSavedDataRef`) after load by running
 * the loaded state through the SAME `buildAutoSaveData` builder the live save path
 * uses. The load-bearing invariant: for unchanged state, the baseline snapshot's
 * serialized form is byte-identical to the live snapshot's, so `hasDataChanged()`
 * (which compares `JSON.stringify(buildSaveData())` against the baseline string)
 * returns false and the brief is NOT re-saved.
 *
 * These tests assert that invariant directly against the builder, which avoids a
 * DOM/renderHook dependency (jsdom is not loadable under the forks pool here).
 */

function makeInput(overrides: Partial<AutoSaveBaselineInput> = {}): AutoSaveBaselineInput {
  return {
    currentView: 'dashboard',
    briefingStep: 7,
    briefData: { page_goal: { value: 'goal' } } as AutoSaveBaselineInput['briefData'],
    staleSteps: new Set<number>([2, 5]),
    userFeedbacks: { 1: 'fb' },
    paaQuestions: ['q1', 'q2'],
    subjectInfo: 'subject',
    brandInfo: 'brand',
    extractedTemplate: null,
    keywords: [{ kw: 'foo', volume: 10 }],
    outputLanguage: 'English',
    serpLanguage: 'English',
    serpCountry: 'United States',
    modelSettings: null,
    lengthConstraints: { globalTarget: null, sectionTargets: {}, strictMode: false },
    ...overrides,
  };
}

describe('useAutoSave baseline seeding (BUG 2)', () => {
  it('baseline snapshot is byte-identical to the live snapshot for unchanged state', () => {
    // Live path and baseline path build from the same logical values.
    const liveLike = makeInput();
    const baselineLike = makeInput();

    const live = JSON.stringify(buildAutoSaveData(liveLike));
    const baseline = JSON.stringify(buildAutoSaveData(baselineLike));

    // This equality is exactly what makes hasDataChanged() return false after load,
    // suppressing the redundant write-back.
    expect(baseline).toBe(live);
  });

  it('key order is stable regardless of input object key order', () => {
    const a = makeInput();
    // Build a second input with keys declared in a different order.
    const b: AutoSaveBaselineInput = {
      lengthConstraints: a.lengthConstraints,
      modelSettings: a.modelSettings,
      serpCountry: a.serpCountry,
      serpLanguage: a.serpLanguage,
      outputLanguage: a.outputLanguage,
      keywords: a.keywords,
      extractedTemplate: a.extractedTemplate,
      brandInfo: a.brandInfo,
      subjectInfo: a.subjectInfo,
      paaQuestions: a.paaQuestions,
      userFeedbacks: a.userFeedbacks,
      staleSteps: a.staleSteps,
      briefData: a.briefData,
      briefingStep: a.briefingStep,
      currentView: a.currentView,
    };

    expect(JSON.stringify(buildAutoSaveData(b))).toBe(JSON.stringify(buildAutoSaveData(a)));
  });

  it('serializes a Set of staleSteps as a sorted-insertion array (matches live path)', () => {
    const snapshot = buildAutoSaveData(makeInput({ staleSteps: new Set<number>([5, 2]) }));
    expect(snapshot.stale_steps).toEqual([5, 2]);
  });

  it('a genuine edit produces a DIFFERENT snapshot so the save still fires', () => {
    const baseline = JSON.stringify(buildAutoSaveData(makeInput()));
    const edited = JSON.stringify(
      buildAutoSaveData(
        makeInput({ briefData: { page_goal: { value: 'EDITED' } } as AutoSaveBaselineInput['briefData'] })
      )
    );

    // hasDataChanged() would see these differ → legitimate user edits are NOT suppressed.
    expect(edited).not.toBe(baseline);
  });

  it('null keywords (no keywords loaded) round-trips identically', () => {
    const a = JSON.stringify(buildAutoSaveData(makeInput({ keywords: null })));
    const b = JSON.stringify(buildAutoSaveData(makeInput({ keywords: null })));
    expect(a).toBe(b);
  });
});
