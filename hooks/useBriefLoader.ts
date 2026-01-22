// useBriefLoader Hook - Load a brief with all related data
import { useState, useCallback } from 'react';
import { getBriefWithRelations } from '../services/briefService';
import { toCompetitorPages } from '../services/competitorService';
import type { BriefWithRelations, AppView } from '../types/database';
import type { AppState } from '../types/appState';
import type { ContentBrief, CompetitorPage } from '../types';

interface UseBriefLoaderReturn {
  loadBrief: (briefId: string) => Promise<LoadedBriefState | null>;
  isLoading: boolean;
  error: string | null;
}

interface LoadedBriefState {
  briefId: string;
  clientId: string;
  currentView: AppView;
  briefingStep: number;
  briefData: Partial<ContentBrief>;
  staleSteps: Set<number>;
  userFeedbacks: { [key: number]: string };
  paaQuestions: string[];
  subjectInfo: string;
  brandInfo: string;
  outputLanguage: string;
  serpLanguage: string;
  serpCountry: string;
  competitorData: CompetitorPage[];
  modelSettings: AppState['modelSettings'];
  lengthConstraints: AppState['lengthConstraints'];
  extractedTemplate: AppState['extractedTemplate'];
  keywords: { kw: string; volume: number }[];
  contextFiles: Array<{
    id: string;
    fileName: string;
    content: string | null;
    status: 'pending' | 'parsing' | 'done' | 'error';
    error: string | null;
  }>;
  contextUrls: Array<{
    id: string;
    url: string;
    content: string | null;
    status: 'pending' | 'scraping' | 'done' | 'error';
    error: string | null;
  }>;
  articles: Array<{
    id: string;
    title: string;
    content: string;
    version: number;
    isCurrent: boolean;
    createdAt: string;
  }>;
}

/**
 * Hook for loading a brief with all related data from Supabase
 */
export function useBriefLoader(): UseBriefLoaderReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBrief = useCallback(async (briefId: string): Promise<LoadedBriefState | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getBriefWithRelations(briefId);

      if (fetchError || !data) {
        setError(fetchError || 'Brief not found');
        return null;
      }

      const brief: BriefWithRelations = data;

      // Convert competitors to app format
      const competitorData = toCompetitorPages(brief.competitors || []);

      // Convert context files to app format
      const contextFiles = (brief.context_files || []).map((f) => ({
        id: f.id,
        fileName: f.file_name,
        content: f.parsed_content,
        status: f.parse_status as 'pending' | 'parsing' | 'done' | 'error',
        error: f.parse_error,
      }));

      // Convert context URLs to app format
      const contextUrls = (brief.context_urls || []).map((u) => ({
        id: u.id,
        url: u.url,
        content: u.scraped_content,
        status: u.scrape_status as 'pending' | 'scraping' | 'done' | 'error',
        error: u.scrape_error,
      }));

      // Convert articles to app format
      const articles = (brief.articles || []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        version: a.version,
        isCurrent: a.is_current,
        createdAt: a.created_at,
      }));

      // Build the loaded state
      const loadedState: LoadedBriefState = {
        briefId: brief.id,
        clientId: brief.client_id,
        currentView: brief.current_view as AppView,
        briefingStep: brief.current_step,
        briefData: brief.brief_data || {},
        staleSteps: new Set(brief.stale_steps || []),
        userFeedbacks: brief.user_feedbacks || {},
        paaQuestions: brief.paa_questions || [],
        subjectInfo: brief.subject_info || '',
        brandInfo: brief.brand_info || '',
        outputLanguage: brief.output_language || 'English',
        serpLanguage: brief.serp_language || 'English',
        serpCountry: brief.serp_country || 'United States',
        competitorData,
        modelSettings: brief.model_settings || null,
        lengthConstraints: brief.length_constraints || {
          globalTarget: null,
          sectionTargets: {},
          strictMode: false,
        },
        extractedTemplate: brief.extracted_template || null,
        keywords: brief.keywords || [],
        contextFiles,
        contextUrls,
        articles,
      };

      return loadedState;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load brief';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    loadBrief,
    isLoading,
    error,
  };
}

export default useBriefLoader;
