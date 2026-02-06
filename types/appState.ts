// App State Types - Centralized state management types
import type { ContentBrief, CompetitorPage, ModelSettings, LengthConstraints, ExtractedTemplate } from '../types';
import type { Brief, AppView } from './database';

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

