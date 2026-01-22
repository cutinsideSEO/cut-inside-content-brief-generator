// App Context - Centralized state management using useReducer
import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type { AppState, AppAction, FileContentState, UrlContentState, SaveStatus } from '../types/appState';
import { initialAppState } from '../types/appState';
import type { ContentBrief, CompetitorPage, ModelSettings, LengthConstraints, ExtractedTemplate } from '../types';
import type { Brief, AppView } from '../types/database';

// ============================================
// Reducer
// ============================================
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Navigation
    case 'SET_VIEW':
      return { ...state, currentView: action.view };

    case 'SET_CLIENT':
      return {
        ...state,
        selectedClientId: action.clientId,
        selectedClientName: action.clientName,
      };

    case 'SET_BRIEF':
      return {
        ...state,
        currentBriefId: action.briefId,
        currentBrief: action.brief,
      };

    // Loading and errors
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'ADD_LOG': {
      const timestamp = new Date().toLocaleTimeString();
      return {
        ...state,
        analysisLogs: [...state.analysisLogs, `[${timestamp}] ${action.message}`],
      };
    }

    case 'CLEAR_LOGS':
      return { ...state, analysisLogs: [] };

    // Save status
    case 'SET_SAVE_STATUS':
      return {
        ...state,
        saveStatus: action.status,
        lastSavedAt: action.savedAt || state.lastSavedAt,
      };

    // Input data
    case 'SET_SUBJECT_INFO':
      return { ...state, subjectInfo: action.value, saveStatus: 'unsaved' };

    case 'SET_BRAND_INFO':
      return { ...state, brandInfo: action.value, saveStatus: 'unsaved' };

    case 'SET_KEYWORD_VOLUME_MAP':
      return { ...state, keywordVolumeMap: action.map };

    case 'SET_LANGUAGES':
      return {
        ...state,
        serpLanguage: action.serpLanguage,
        outputLanguage: action.outputLanguage,
      };

    case 'SET_SERP_COUNTRY':
      return { ...state, serpCountry: action.country };

    case 'SET_API_CREDENTIALS':
      return { ...state, apiLogin: action.login, apiPassword: action.password };

    // Competitor data
    case 'SET_COMPETITOR_DATA':
      return { ...state, competitorData: action.data };

    case 'SET_TOP_KEYWORDS':
      return { ...state, topKeywordsForViz: action.keywords };

    case 'TOGGLE_COMPETITOR_STAR':
      return {
        ...state,
        competitorData: state.competitorData.map((c) =>
          c.URL === action.url ? { ...c, is_starred: !c.is_starred } : c
        ),
        saveStatus: 'unsaved',
      };

    // File context
    case 'ADD_CONTEXT_FILES': {
      const newFilesMap = new Map(state.contextFiles);
      const newContentsMap = new Map(state.fileContents);
      for (const file of action.files) {
        if (!newFilesMap.has(file.name)) {
          newFilesMap.set(file.name, file);
          newContentsMap.set(file.name, { content: null, error: null, status: 'pending' });
        }
      }
      return {
        ...state,
        contextFiles: newFilesMap,
        fileContents: newContentsMap,
        saveStatus: 'unsaved',
      };
    }

    case 'REMOVE_CONTEXT_FILE': {
      const newFilesMap = new Map(state.contextFiles);
      const newContentsMap = new Map(state.fileContents);
      newFilesMap.delete(action.fileName);
      newContentsMap.delete(action.fileName);
      return {
        ...state,
        contextFiles: newFilesMap,
        fileContents: newContentsMap,
        saveStatus: 'unsaved',
      };
    }

    case 'SET_FILE_CONTENT': {
      const newContentsMap = new Map(state.fileContents);
      newContentsMap.set(action.fileName, action.state);
      return { ...state, fileContents: newContentsMap };
    }

    case 'ADD_URL_CONTENT': {
      const newUrlContents = new Map(state.urlContents);
      newUrlContents.set(action.url, action.state);
      return { ...state, urlContents: newUrlContents, saveStatus: 'unsaved' };
    }

    case 'REMOVE_URL_CONTENT': {
      const newUrlContents = new Map(state.urlContents);
      newUrlContents.delete(action.url);
      return { ...state, urlContents: newUrlContents, saveStatus: 'unsaved' };
    }

    case 'SET_URL_CONTENT': {
      const newUrlContents = new Map(state.urlContents);
      newUrlContents.set(action.url, action.state);
      return { ...state, urlContents: newUrlContents };
    }

    // Brief generation
    case 'SET_BRIEF_DATA':
      return { ...state, briefData: action.data, saveStatus: 'unsaved' };

    case 'MERGE_BRIEF_DATA':
      return {
        ...state,
        briefData: { ...state.briefData, ...action.data },
        saveStatus: 'unsaved',
      };

    case 'SET_BRIEFING_STEP':
      return { ...state, briefingStep: action.step, saveStatus: 'unsaved' };

    case 'SET_STALE_STEPS':
      return { ...state, staleSteps: action.steps };

    case 'ADD_STALE_STEPS': {
      const newStaleSteps = new Set(state.staleSteps);
      action.steps.forEach((step) => newStaleSteps.add(step));
      return { ...state, staleSteps: newStaleSteps, saveStatus: 'unsaved' };
    }

    case 'REMOVE_STALE_STEP': {
      const newStaleSteps = new Set(state.staleSteps);
      newStaleSteps.delete(action.step);
      return { ...state, staleSteps: newStaleSteps };
    }

    case 'SET_USER_FEEDBACK':
      return {
        ...state,
        userFeedbacks: { ...state.userFeedbacks, [action.step]: action.feedback },
        saveStatus: 'unsaved',
      };

    case 'SET_LOADING_STEP':
      return { ...state, loadingStep: action.step };

    // Settings
    case 'SET_MODEL_SETTINGS':
      return { ...state, modelSettings: action.settings };

    case 'SET_LENGTH_CONSTRAINTS':
      return { ...state, lengthConstraints: action.constraints };

    case 'SET_EXTRACTED_TEMPLATE':
      return { ...state, extractedTemplate: action.template, saveStatus: 'unsaved' };

    case 'SET_PAA_QUESTIONS':
      return { ...state, paaQuestions: action.questions, saveStatus: 'unsaved' };

    // Content generation
    case 'SET_GENERATED_ARTICLE':
      return { ...state, generatedArticle: action.article };

    case 'SET_GENERATION_PROGRESS':
      return { ...state, generationProgress: action.progress };

    // Special modes
    case 'SET_UPLOADED_BRIEF':
      return { ...state, isUploadedBrief: action.isUploaded };

    case 'SET_WRITER_INSTRUCTIONS':
      return { ...state, writerInstructions: action.instructions };

    case 'SET_FEELING_LUCKY':
      return { ...state, isFeelingLuckyFlow: action.isLucky };

    // Fun factor
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] };

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };

    case 'SET_FIRST_BRIEF_COMPLETED':
      return { ...state, hasCompletedFirstBrief: true };

    case 'SET_DATA_MAVEN_ACHIEVED':
      return { ...state, hasAchievedDataMaven: true };

    // Full state operations
    case 'LOAD_BRIEF_STATE':
      return { ...state, ...action.state };

    case 'RESET_STATE':
      return {
        ...initialAppState,
        // Preserve auth-related state
        currentView: state.currentView === 'login' ? 'login' : 'client_select',
        selectedClientId: state.selectedClientId,
        selectedClientName: state.selectedClientName,
      };

    default:
      return state;
  }
}

// ============================================
// Context Type
// ============================================
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;

  // Convenience actions
  setView: (view: AppView) => void;
  setClient: (clientId: string | null, clientName: string | null) => void;
  setBrief: (briefId: string | null, brief: Brief | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addLog: (message: string) => void;
  setSaveStatus: (status: SaveStatus, savedAt?: Date) => void;
  setSubjectInfo: (value: string) => void;
  setBrandInfo: (value: string) => void;
  setBriefData: (data: Partial<ContentBrief>) => void;
  mergeBriefData: (data: Partial<ContentBrief>) => void;
  setBriefingStep: (step: number) => void;
  setStaleSteps: (steps: Set<number>) => void;
  toggleCompetitorStar: (url: string) => void;
  addToast: (title: string, message: string) => void;
  removeToast: (id: number) => void;
  resetState: () => void;
}

// ============================================
// Context
// ============================================
const AppContext = createContext<AppContextType | null>(null);

// ============================================
// Provider
// ============================================
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  // Convenience actions
  const setView = useCallback((view: AppView) => {
    dispatch({ type: 'SET_VIEW', view });
  }, []);

  const setClient = useCallback((clientId: string | null, clientName: string | null) => {
    dispatch({ type: 'SET_CLIENT', clientId, clientName });
  }, []);

  const setBrief = useCallback((briefId: string | null, brief: Brief | null) => {
    dispatch({ type: 'SET_BRIEF', briefId, brief });
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', isLoading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const addLog = useCallback((message: string) => {
    dispatch({ type: 'ADD_LOG', message });
  }, []);

  const setSaveStatus = useCallback((status: SaveStatus, savedAt?: Date) => {
    dispatch({ type: 'SET_SAVE_STATUS', status, savedAt });
  }, []);

  const setSubjectInfo = useCallback((value: string) => {
    dispatch({ type: 'SET_SUBJECT_INFO', value });
  }, []);

  const setBrandInfo = useCallback((value: string) => {
    dispatch({ type: 'SET_BRAND_INFO', value });
  }, []);

  const setBriefData = useCallback((data: Partial<ContentBrief>) => {
    dispatch({ type: 'SET_BRIEF_DATA', data });
  }, []);

  const mergeBriefData = useCallback((data: Partial<ContentBrief>) => {
    dispatch({ type: 'MERGE_BRIEF_DATA', data });
  }, []);

  const setBriefingStep = useCallback((step: number) => {
    dispatch({ type: 'SET_BRIEFING_STEP', step });
  }, []);

  const setStaleSteps = useCallback((steps: Set<number>) => {
    dispatch({ type: 'SET_STALE_STEPS', steps });
  }, []);

  const toggleCompetitorStar = useCallback((url: string) => {
    dispatch({ type: 'TOGGLE_COMPETITOR_STAR', url });
  }, []);

  const addToast = useCallback((title: string, message: string) => {
    dispatch({ type: 'ADD_TOAST', toast: { id: Date.now(), title, message } });
  }, []);

  const removeToast = useCallback((id: number) => {
    dispatch({ type: 'REMOVE_TOAST', id });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const value: AppContextType = {
    state,
    dispatch,
    setView,
    setClient,
    setBrief,
    setLoading,
    setError,
    addLog,
    setSaveStatus,
    setSubjectInfo,
    setBrandInfo,
    setBriefData,
    mergeBriefData,
    setBriefingStep,
    setStaleSteps,
    toggleCompetitorStar,
    addToast,
    removeToast,
    resetState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ============================================
// Hook
// ============================================
export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
