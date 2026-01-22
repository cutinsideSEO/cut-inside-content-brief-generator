// App State Types - Centralized state management types
import type { ContentBrief, CompetitorPage, ModelSettings, LengthConstraints, ExtractedTemplate } from '../types';
import type { Brief, BriefWithRelations, AppView } from './database';

// ============================================
// File and URL Content States
// ============================================
export interface FileContentState {
  content: string | null;
  error: string | null;
  status: 'pending' | 'parsing' | 'done';
}

export interface UrlContentState {
  content: string | null;
  error: string | null;
  status: 'pending' | 'scraping' | 'done';
}

// ============================================
// Save Status
// ============================================
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

// ============================================
// App State
// ============================================
export interface AppState {
  // Navigation
  currentView: AppView;

  // Brief context (when working with Supabase)
  selectedClientId: string | null;
  selectedClientName: string | null;
  currentBriefId: string | null;
  currentBrief: Brief | null;

  // Loading and error states
  isLoading: boolean;
  error: string | null;
  analysisLogs: string[];

  // Save status
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;

  // Input data
  subjectInfo: string;
  brandInfo: string;
  keywordVolumeMap: Map<string, number>;
  serpLanguage: string;
  outputLanguage: string;
  serpCountry: string;

  // DataForSEO API credentials (from env or user input)
  apiLogin: string;
  apiPassword: string;

  // Competitor data
  competitorData: CompetitorPage[];
  topKeywordsForViz: { kw: string; volume: number }[];

  // File context
  contextFiles: Map<string, File>;
  fileContents: Map<string, FileContentState>;
  urlContents: Map<string, UrlContentState>;

  // Brief generation
  briefData: Partial<ContentBrief>;
  briefingStep: number;
  staleSteps: Set<number>;
  userFeedbacks: { [key: number]: string };
  loadingStep: number | null;

  // Settings
  modelSettings: ModelSettings | null;
  lengthConstraints: LengthConstraints;
  extractedTemplate: ExtractedTemplate | null;
  paaQuestions: string[];

  // Content generation
  generatedArticle: { title: string; content: string } | null;
  generationProgress: { currentSection: string; currentIndex: number; total: number } | null;

  // Special modes
  isUploadedBrief: boolean;
  writerInstructions: string;
  isFeelingLuckyFlow: boolean;

  // Fun factor
  toasts: { id: number; title: string; message: string }[];
  hasCompletedFirstBrief: boolean;
  hasAchievedDataMaven: boolean;
}

// ============================================
// Action Types
// ============================================
export type AppAction =
  // Navigation
  | { type: 'SET_VIEW'; view: AppView }
  | { type: 'SET_CLIENT'; clientId: string | null; clientName: string | null }
  | { type: 'SET_BRIEF'; briefId: string | null; brief: Brief | null }

  // Loading and errors
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'ADD_LOG'; message: string }
  | { type: 'CLEAR_LOGS' }

  // Save status
  | { type: 'SET_SAVE_STATUS'; status: SaveStatus; savedAt?: Date }

  // Input data
  | { type: 'SET_SUBJECT_INFO'; value: string }
  | { type: 'SET_BRAND_INFO'; value: string }
  | { type: 'SET_KEYWORD_VOLUME_MAP'; map: Map<string, number> }
  | { type: 'SET_LANGUAGES'; serpLanguage: string; outputLanguage: string }
  | { type: 'SET_SERP_COUNTRY'; country: string }
  | { type: 'SET_API_CREDENTIALS'; login: string; password: string }

  // Competitor data
  | { type: 'SET_COMPETITOR_DATA'; data: CompetitorPage[] }
  | { type: 'SET_TOP_KEYWORDS'; keywords: { kw: string; volume: number }[] }
  | { type: 'TOGGLE_COMPETITOR_STAR'; url: string }

  // File context
  | { type: 'ADD_CONTEXT_FILES'; files: File[] }
  | { type: 'REMOVE_CONTEXT_FILE'; fileName: string }
  | { type: 'SET_FILE_CONTENT'; fileName: string; state: FileContentState }
  | { type: 'ADD_URL_CONTENT'; url: string; state: UrlContentState }
  | { type: 'REMOVE_URL_CONTENT'; url: string }
  | { type: 'SET_URL_CONTENT'; url: string; state: UrlContentState }

  // Brief generation
  | { type: 'SET_BRIEF_DATA'; data: Partial<ContentBrief> }
  | { type: 'MERGE_BRIEF_DATA'; data: Partial<ContentBrief> }
  | { type: 'SET_BRIEFING_STEP'; step: number }
  | { type: 'SET_STALE_STEPS'; steps: Set<number> }
  | { type: 'ADD_STALE_STEPS'; steps: number[] }
  | { type: 'REMOVE_STALE_STEP'; step: number }
  | { type: 'SET_USER_FEEDBACK'; step: number; feedback: string }
  | { type: 'SET_LOADING_STEP'; step: number | null }

  // Settings
  | { type: 'SET_MODEL_SETTINGS'; settings: ModelSettings | null }
  | { type: 'SET_LENGTH_CONSTRAINTS'; constraints: LengthConstraints }
  | { type: 'SET_EXTRACTED_TEMPLATE'; template: ExtractedTemplate | null }
  | { type: 'SET_PAA_QUESTIONS'; questions: string[] }

  // Content generation
  | { type: 'SET_GENERATED_ARTICLE'; article: { title: string; content: string } | null }
  | { type: 'SET_GENERATION_PROGRESS'; progress: { currentSection: string; currentIndex: number; total: number } | null }

  // Special modes
  | { type: 'SET_UPLOADED_BRIEF'; isUploaded: boolean }
  | { type: 'SET_WRITER_INSTRUCTIONS'; instructions: string }
  | { type: 'SET_FEELING_LUCKY'; isLucky: boolean }

  // Fun factor
  | { type: 'ADD_TOAST'; toast: { id: number; title: string; message: string } }
  | { type: 'REMOVE_TOAST'; id: number }
  | { type: 'SET_FIRST_BRIEF_COMPLETED' }
  | { type: 'SET_DATA_MAVEN_ACHIEVED' }

  // Full state operations
  | { type: 'LOAD_BRIEF_STATE'; state: Partial<AppState> }
  | { type: 'RESET_STATE' };

// ============================================
// Initial State
// ============================================
export const initialAppState: AppState = {
  // Navigation
  currentView: 'login',

  // Brief context
  selectedClientId: null,
  selectedClientName: null,
  currentBriefId: null,
  currentBrief: null,

  // Loading and error states
  isLoading: false,
  error: null,
  analysisLogs: [],

  // Save status
  saveStatus: 'saved',
  lastSavedAt: null,

  // Input data
  subjectInfo: '',
  brandInfo: '',
  keywordVolumeMap: new Map(),
  serpLanguage: 'English',
  outputLanguage: 'English',
  serpCountry: 'United States',

  // API credentials
  apiLogin: '',
  apiPassword: '',

  // Competitor data
  competitorData: [],
  topKeywordsForViz: [],

  // File context
  contextFiles: new Map(),
  fileContents: new Map(),
  urlContents: new Map(),

  // Brief generation
  briefData: {},
  briefingStep: 1,
  staleSteps: new Set(),
  userFeedbacks: {},
  loadingStep: null,

  // Settings
  modelSettings: null,
  lengthConstraints: {
    globalTarget: null,
    sectionTargets: {},
    strictMode: false,
  },
  extractedTemplate: null,
  paaQuestions: [],

  // Content generation
  generatedArticle: null,
  generationProgress: null,

  // Special modes
  isUploadedBrief: false,
  writerInstructions: '',
  isFeelingLuckyFlow: false,

  // Fun factor
  toasts: [],
  hasCompletedFirstBrief: false,
  hasAchievedDataMaven: false,
};
