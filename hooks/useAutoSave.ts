// useAutoSave Hook - Debounced auto-save to Supabase
import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { saveBriefState } from '../services/briefService';
import { saveCompetitors } from '../services/competitorService';
import type { AppState, SaveStatus } from '../types/appState';
import type { AppView } from '../types/database';
import type { ContentBrief, CompetitorPage, ExtractedTemplate, ModelSettings, LengthConstraints } from '../types';

interface AutoSaveData {
  current_view: AppView;
  current_step: number;
  brief_data: Partial<ContentBrief>;
  stale_steps: number[];
  user_feedbacks: { [key: number]: string };
  paa_questions: string[];
  subject_info: string;
  brand_info: string;
  extracted_template: ExtractedTemplate | null;
  // New fields to save
  keywords: { kw: string; volume: number }[] | null;
  output_language: string;
  serp_language: string;
  serp_country: string;
  model_settings: ModelSettings | null;
  length_constraints: LengthConstraints | null;
}

interface UseAutoSaveOptions {
  briefId: string | null;
  enabled: boolean;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveSuccess?: (savedAt: Date) => void;
  onSaveError?: (error: string) => void;
}

interface UseAutoSaveReturn {
  triggerSave: () => void;
  saveNow: () => Promise<void>;
  isSaving: boolean;
}

/**
 * Hook for auto-saving brief state with debouncing
 */
export function useAutoSave(
  state: Pick<
    AppState,
    | 'currentView'
    | 'briefingStep'
    | 'briefData'
    | 'staleSteps'
    | 'userFeedbacks'
    | 'paaQuestions'
    | 'subjectInfo'
    | 'brandInfo'
    | 'extractedTemplate'
    | 'competitorData'
    | 'saveStatus'
    // New fields for complete persistence
    | 'outputLanguage'
    | 'serpLanguage'
    | 'serpCountry'
    | 'modelSettings'
    | 'lengthConstraints'
  > & {
    // Keywords passed separately since App.tsx uses a different structure
    keywords: { kw: string; volume: number }[] | null;
  },
  options: UseAutoSaveOptions
): UseAutoSaveReturn {
  const {
    briefId,
    enabled,
    debounceMs = 500, // Reduced from 2000ms to minimize data loss on navigation
    onSaveStart,
    onSaveSuccess,
    onSaveError,
  } = options;

  const isSavingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDataRef = useRef<string | null>(null);

  // Build the data to save
  const buildSaveData = useCallback((): AutoSaveData => {
    return {
      current_view: state.currentView as AppView,
      current_step: state.briefingStep,
      brief_data: state.briefData,
      stale_steps: Array.from(state.staleSteps),
      user_feedbacks: state.userFeedbacks,
      paa_questions: state.paaQuestions,
      subject_info: state.subjectInfo,
      brand_info: state.brandInfo,
      extracted_template: state.extractedTemplate,
      // New fields
      keywords: state.keywords,
      output_language: state.outputLanguage,
      serp_language: state.serpLanguage,
      serp_country: state.serpCountry,
      model_settings: state.modelSettings,
      length_constraints: state.lengthConstraints,
    };
  }, [
    state.currentView,
    state.briefingStep,
    state.briefData,
    state.staleSteps,
    state.userFeedbacks,
    state.paaQuestions,
    state.subjectInfo,
    state.brandInfo,
    state.extractedTemplate,
    state.keywords,
    state.outputLanguage,
    state.serpLanguage,
    state.serpCountry,
    state.modelSettings,
    state.lengthConstraints,
  ]);

  // Check if data has changed
  const hasDataChanged = useCallback((): boolean => {
    const currentData = JSON.stringify(buildSaveData());
    return currentData !== lastSavedDataRef.current;
  }, [buildSaveData]);

  // Perform the save
  const performSave = useCallback(async () => {
    if (!briefId || !enabled || isSavingRef.current) {
      return;
    }

    // Check if data actually changed
    if (!hasDataChanged()) {
      return;
    }

    isSavingRef.current = true;
    onSaveStart?.();

    try {
      const saveData = buildSaveData();

      // Save brief state
      const { error } = await saveBriefState(briefId, saveData);

      if (error) {
        throw new Error(error);
      }

      // Save competitors if they exist
      if (state.competitorData.length > 0) {
        await saveCompetitors(briefId, state.competitorData);
      }

      // Update last saved data reference
      lastSavedDataRef.current = JSON.stringify(saveData);

      const savedAt = new Date();
      onSaveSuccess?.(savedAt);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      onSaveError?.(message);
    } finally {
      isSavingRef.current = false;
    }
  }, [
    briefId,
    enabled,
    buildSaveData,
    hasDataChanged,
    state.competitorData,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
  ]);

  // Debounced save trigger
  const triggerSave = useCallback(() => {
    if (!enabled || !briefId) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);
  }, [enabled, briefId, debounceMs, performSave]);

  // Immediate save (bypass debounce)
  const saveNow = useCallback(async () => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    await performSave();
  }, [performSave]);

  // Auto-save when saveStatus changes to 'unsaved'
  useEffect(() => {
    if (state.saveStatus === 'unsaved' && enabled && briefId) {
      triggerSave();
    }
  }, [state.saveStatus, enabled, briefId, triggerSave]);

  // Store a ref to the latest performSave function and state for unmount cleanup
  const performSaveRef = useRef(performSave);
  const hasDataChangedRef = useRef(hasDataChanged);
  const enabledRef = useRef(enabled);
  const briefIdRef = useRef(briefId);

  // Keep refs up to date
  useEffect(() => {
    performSaveRef.current = performSave;
    hasDataChangedRef.current = hasDataChanged;
    enabledRef.current = enabled;
    briefIdRef.current = briefId;
  });

  // Cleanup on unmount - flush pending saves
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Fire a save on unmount if there are pending changes
      // This helps prevent data loss when navigating away
      if (enabledRef.current && briefIdRef.current && hasDataChangedRef.current()) {
        performSaveRef.current();
      }
    };
  }, []);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.saveStatus === 'unsaved' && briefId && enabled) {
        // Try to save synchronously (won't always work)
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.saveStatus, briefId, enabled]);

  return {
    triggerSave,
    saveNow,
    isSaving: isSavingRef.current,
  };
}

export default useAutoSave;
