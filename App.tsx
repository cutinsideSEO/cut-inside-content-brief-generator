import React, { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import Header from './components/Header';
import { setModelSettings, regenerateParagraph } from './services/geminiService';
import * as dataforseoService from './services/dataforseoService';
import { extractTemplateFromUrl } from './services/templateExtractionService';
import type { CompetitorPage, ContentBrief, OutlineItem, ModelSettings, LengthConstraints, ExtractedTemplate } from './types';
import { SOUND_EFFECTS } from './constants';
import { getClientWithContext } from './services/clientService';
import { buildBrandContext, formatForArticleGeneration } from './services/brandContextBuilder';
import type { ClientWithContext } from './types/database';
import { BrainCircuitIcon } from './components/Icon';
import { getClientLogoUrl } from './lib/favicon';

// Import the new screen components
import InitialInputScreen from './components/screens/InitialInputScreen';
import ContextInputScreen from './components/screens/ContextInputScreen';
import CompetitionVizScreen from './components/screens/CompetitionVizScreen';
import DashboardScreen from './components/screens/DashboardScreen';
import ContentGenerationScreen from './components/screens/ContentGenerationScreen';
import ArticleScreen from './components/screens/ArticleScreen';

// Import Supabase integration components
import SaveStatusIndicator from './components/SaveStatusIndicator';
import Sidebar from './components/Sidebar';
import { useBriefLoader } from './hooks/useBriefLoader';
import { useAutoSave } from './hooks/useAutoSave';
import { saveBriefState, updateBriefProgress, updateBriefStatus, updateBrief, updateBriefWorkflowStatus, getBrief } from './services/briefService';
import { saveCompetitors, getCompetitorsForBrief, toCompetitorPages } from './services/competitorService';
import { getCurrentArticle } from './services/articleService';
import { uploadContextFile, addContextUrl as addContextUrlToDb, deleteContextFile, deleteContextUrl } from './services/contextService';
import { createGenerationJob, cancelGenerationJob } from './services/generationJobService';
import { useGenerationSubscription } from './hooks/useGenerationSubscription';
import { useBriefRealtimeSync } from './hooks/useBriefRealtimeSync';
import type { SaveStatus } from './types/appState';
import type { BriefStatus } from './types/database';
import { shouldMarkBriefCompleteOnJobCompletion } from './utils/generationStatus';

type AppView = 'initial_input' | 'context_input' | 'visualization' | 'dashboard' | 'content_generation' | 'article_view';
type ToastMessage = { id: number; title: string; message: string };

// Props for Supabase integration
interface AppProps {
  briefId?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  onBackToBriefList?: () => void;
  onSaveStatusChange?: (status: SaveStatus, savedAt?: Date) => void;
  saveStatus?: SaveStatus;
  lastSavedAt?: Date | null;
  // Generation callbacks
  onGenerationStart?: (type: 'competitors' | 'brief' | 'content', briefId: string) => void;
  onGenerationProgress?: (step: number) => void;
  onGenerationComplete?: (briefId: string, success: boolean) => void;
  // Callback for parent to request an immediate save (for save-before-navigation)
  onSaveNowRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// --- Sound Context ---
interface SoundContextType {
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playSound: (sound: keyof typeof SOUND_EFFECTS) => void;
}
const SoundContext = createContext<SoundContextType | null>(null);
export const useSound = () => useContext(SoundContext);

const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const audioRefs = React.useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    Object.keys(SOUND_EFFECTS).forEach(key => {
      audioRefs.current[key] = new Audio(SOUND_EFFECTS[key as keyof typeof SOUND_EFFECTS]);
    });
  }, []);

  const toggleSound = () => setIsSoundEnabled(prev => !prev);
  const playSound = (sound: keyof typeof SOUND_EFFECTS) => {
    if (isSoundEnabled) {
      const audio = audioRefs.current[sound];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.error("Error playing sound:", e));
      }
    }
  };

  return (
    <SoundContext.Provider value={{ isSoundEnabled, toggleSound, playSound }}>
      {children}
    </SoundContext.Provider>
  );
};


// A helper function to wait for a global library to be available
const waitForLibrary = <T,>(globalName: string, timeout = 5000): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Check if it's already there
    if ((window as any)[globalName]) {
      return resolve((window as any)[globalName]);
    }

    let elapsedTime = 0;
    const interval = 100;

    const timer = setInterval(() => {
      if ((window as any)[globalName]) {
        clearInterval(timer);
        resolve((window as any)[globalName]);
      } else {
        elapsedTime += interval;
        if (elapsedTime >= timeout) {
          clearInterval(timer);
          reject(new Error(`Library ${globalName} failed to load within ${timeout}ms.`));
        }
      }
    }, interval);
  });
};

const Toast: React.FC<ToastMessage & { onDismiss: () => void }> = ({ title, message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="toast bg-teal/90 backdrop-blur-sm border border-teal/50 text-white p-4 rounded-lg shadow-lg w-80">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <BrainCircuitIcon className="h-6 w-6 text-amber-500" />
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-heading font-bold">{title}</p>
          <p className="mt-1 text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};


const App: React.FC<AppProps> = ({
  briefId,
  clientId,
  clientName,
  onBackToBriefList,
  onSaveStatusChange,
  saveStatus: externalSaveStatus,
  lastSavedAt: externalLastSavedAt,
  onGenerationStart,
  onGenerationProgress,
  onGenerationComplete,
  onSaveNowRef,
}) => {
  const [currentView, setCurrentView] = useState<AppView>('initial_input');
  // Start as loading when briefId is provided — prevents auto-save from
  // writing stale default state during initial brief load (especially
  // important because React StrictMode double-mounts in dev, triggering
  // the unmount cleanup which would save stale data before load completes).
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(briefId));
  const [error, setError] = useState<string | null>(null);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);

  // Internal save status for auto-save
  const [internalSaveStatus, setInternalSaveStatus] = useState<SaveStatus>('saved');
  const [internalLastSavedAt, setInternalLastSavedAt] = useState<Date | null>(null);

  // Use external or internal save status
  const saveStatus = externalSaveStatus ?? internalSaveStatus;
  const lastSavedAt = externalLastSavedAt ?? internalLastSavedAt;
  
  // Data state
  const [subjectInfo, setSubjectInfo] = useState('');
  const [combinedSubjectInfo, setCombinedSubjectInfo] = useState('');
  const [brandInfo, setBrandInfo] = useState('');
  const [keywordVolumeMap, setKeywordVolumeMap] = useState<Map<string, number>>(new Map());
  const [competitorData, setCompetitorData] = useState<CompetitorPage[]>([]);
  const [topKeywordsForViz, setTopKeywordsForViz] = useState<{ kw: string, volume: number }[]>([]);
  const [briefData, setBriefData] = useState<Partial<ContentBrief>>({});
  const [serpLanguage, setSerpLanguage] = useState('English');
  const [outputLanguage, setOutputLanguage] = useState('English');
  
  // File context state
  const [contextFiles, setContextFiles] = useState<Map<string, File>>(new Map());
  const [fileContents, setFileContents] = useState<Map<string, { content: string | null; error: string | null; status: 'pending' | 'parsing' | 'done' }>>(new Map());
  const [urlContents, setUrlContents] = useState<Map<string, { content: string | null; error: string | null; status: 'pending' | 'scraping' | 'done' }>>(new Map());

  // Briefing & Dashboard state
  const [briefingStep, setBriefingStep] = useState(1);
  const [staleSteps, setStaleSteps] = useState<Set<number>>(new Set());
  const [userFeedbacks, setUserFeedbacks] = useState<{ [key: number]: string }>({});
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [briefStatus, setBriefStatus] = useState<BriefStatus>('draft');
  const [writerInstructions, setWriterInstructions] = useState<string>('');
  const [dashboardSection, setDashboardSection] = useState<number | null>(null);

  // Content generation state
  const [generatedArticle, setGeneratedArticle] = useState<{ title: string; content: string } | null>(null);
  const [generatedArticleDbId, setGeneratedArticleDbId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{ currentSection: string; currentIndex: number; total: number } | null>(null);

  // Client brand profile for brand context injection (must be declared before useEffects that reference it)
  const [clientProfile, setClientProfile] = useState<ClientWithContext | null>(null);

  // AbortController for cancelling in-flight AI generation requests on unmount
  // (kept for inline edits like paragraph regeneration / rewrite selection)
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Fetch client brand profile when clientId is available
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    getClientWithContext(clientId).then(({ data }) => {
      if (!cancelled && data) {
        setClientProfile(data);
      }
    }).catch(err => {
      console.warn('Failed to load client profile:', err);
    });
    return () => { cancelled = true; };
  }, [clientId]);

  // Apply client defaults to new briefs when profile loads
  const hasAppliedDefaults = useRef(false);
  useEffect(() => {
    if (!clientProfile || hasAppliedDefaults.current) return;
    const cs = clientProfile.content_strategy;
    const os = clientProfile.operational_settings;
    if (!cs && !os) return;

    // Only apply defaults if brief is new (still on initial_input with no saved data)
    if (currentView === 'initial_input' && !subjectInfo && !brandInfo) {
      hasAppliedDefaults.current = true;
      if (cs?.default_output_language) setOutputLanguage(cs.default_output_language);
      if (cs?.default_serp_language) setSerpLanguage(cs.default_serp_language);
      if (cs?.default_serp_country) setSerpCountry(cs.default_serp_country);
    }
  }, [clientProfile, currentView, subjectInfo, brandInfo]);

  // "Fun Factor" State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hasCompletedFirstBrief, setHasCompletedFirstBrief] = useState(false);
  const [hasAchievedDataMaven, setHasAchievedDataMaven] = useState(false);

  // Feature 1, 2 & 3: Template and length constraints
  const [extractedTemplate, setExtractedTemplate] = useState<ExtractedTemplate | null>(null);
  const [lengthConstraints, setLengthConstraints] = useState<LengthConstraints>({
    globalTarget: null,
    sectionTargets: {},
    strictMode: false,
  });

  // Model settings and SERP country for auto-save
  const [modelSettings, setModelSettingsState] = useState<ModelSettings | null>(null);
  const [serpCountry, setSerpCountry] = useState('United States');

  // Feature: PAA (People Also Ask) questions collected from SERPs
  const [paaQuestions, setPaaQuestions] = useState<string[]>([]);

  // Brief loader hook
  const { loadBrief, isLoading: isBriefLoading } = useBriefLoader();

  // Build keywords array from keywordVolumeMap for auto-save
  const keywordsForSave = topKeywordsForViz.length > 0
    ? topKeywordsForViz
    : Array.from(keywordVolumeMap.entries()).map(([kw, volume]) => ({ kw, volume }));

  // Auto-save hook (only active in Supabase mode)
  const { triggerSave, saveNow, pauseAutoSave } = useAutoSave(
    {
      currentView,
      briefingStep,
      briefData,
      staleSteps,
      userFeedbacks,
      paaQuestions,
      subjectInfo,
      brandInfo,
      extractedTemplate,
      competitorData,
      saveStatus: internalSaveStatus,
      // New fields for complete persistence
      outputLanguage,
      serpLanguage,
      serpCountry,
      modelSettings,
      lengthConstraints,
      keywords: keywordsForSave.length > 0 ? keywordsForSave : null,
    },
    {
      briefId: briefId || null,
      enabled: Boolean(briefId) && !isLoading,
      currentDbStatus: briefStatus,
      debounceMs: 500, // Reduced to minimize data loss
      onSaveStart: () => {
        setInternalSaveStatus('saving');
        onSaveStatusChange?.('saving');
      },
      onSaveSuccess: (savedAt) => {
        setInternalSaveStatus('saved');
        setInternalLastSavedAt(savedAt);
        onSaveStatusChange?.('saved', savedAt);
      },
      onSaveError: (error) => {
        console.error('Auto-save failed:', error);
        setInternalSaveStatus('error');
        onSaveStatusChange?.('error');
      },
    }
  );

  // Expose saveNow to parent via ref (for save-before-navigation)
  useEffect(() => {
    if (onSaveNowRef) {
      onSaveNowRef.current = saveNow;
    }
    return () => {
      if (onSaveNowRef) {
        onSaveNowRef.current = null;
      }
    };
  }, [onSaveNowRef, saveNow]);

  // ============================================
  // Backend Generation (Supabase Edge Functions)
  // ============================================

  // Subscribe to real-time generation job updates for this brief
  const {
    activeJob,
    isGenerating: isBackendGenerating,
    progress: backendProgress,
    error: backendError,
    refreshJob,
  } = useGenerationSubscription(briefId || null);

  // Subscribe to real-time brief data updates (when backend saves step results)
  useBriefRealtimeSync(briefId || null, {
    onBriefDataUpdated: useCallback((newBriefData: Partial<ContentBrief>) => {
      // Only sync from backend when a backend job is active
      if (activeJob && (activeJob.status === 'pending' || activeJob.status === 'running')) {
        setBriefData(newBriefData);
      }
    }, [activeJob]),
    onStaleStepsUpdated: useCallback((newStaleSteps: number[]) => {
      setStaleSteps(new Set(newStaleSteps));
    }, []),
    onStatusUpdated: useCallback((newStatus: string) => {
      setBriefStatus(newStatus as BriefStatus);
    }, []),
    onStepUpdated: useCallback((newStep: number) => {
      // Update briefing step to show the latest completed step
      if (newStep > 0) setBriefingStep(newStep);
    }, []),
    onViewUpdated: useCallback((newView: AppView) => {
      if (newView !== 'dashboard') return;
      setCurrentView((prev) => (
        prev === 'content_generation' || prev === 'article_view' ? prev : 'dashboard'
      ));
    }, []),
  });

  // Derive effective loading state: either local or backend
  const isBackendJobActive = isBackendGenerating;
  const backendStepName = backendProgress?.step_name || null;
  const backendCurrentStep = backendProgress?.current_step || null;

  // Start a full brief generation via backend
  const handleBackendFullBrief = useCallback(async () => {
    if (!briefId) return;
    try {
      // Save current state first so the job snapshot is up to date
      await saveNow();
      const { jobId } = await createGenerationJob(briefId, 'full_brief');
      console.log('Started backend full_brief job:', jobId);
      await refreshJob();
      // Notify parent
      if (onGenerationStart) onGenerationStart('brief', briefId);
    } catch (err) {
      console.error('Failed to start backend generation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start backend generation');
    }
  }, [briefId, saveNow, refreshJob, onGenerationStart]);

  // Regenerate a single step via backend
  const handleBackendRegenerate = useCallback(async (logicalStep: number, feedback?: string) => {
    if (!briefId) return;
    try {
      await saveNow();
      const { jobId } = await createGenerationJob(briefId, 'regenerate', {
        stepNumber: logicalStep,
        userFeedback: feedback || userFeedbacks[logicalStep] || undefined,
      });
      console.log('Started backend regenerate job:', jobId);
      await refreshJob();
    } catch (err) {
      console.error('Failed to start backend regeneration:', err);
      setError(err instanceof Error ? err.message : 'Failed to start backend regeneration');
    }
  }, [briefId, saveNow, refreshJob, userFeedbacks]);

  // Start article generation via backend
  const handleBackendArticleGeneration = useCallback(async () => {
    if (!briefId) return;
    try {
      await saveNow();
      const { jobId } = await createGenerationJob(briefId, 'article', {
        writerInstructions: writerInstructions?.trim() || undefined,
      });
      console.log('Started backend article job:', jobId);
      await refreshJob();
      if (onGenerationStart) onGenerationStart('content', briefId);
    } catch (err) {
      console.error('Failed to start backend article generation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start backend article generation');
      setIsLoading(false);
    }
  }, [briefId, saveNow, refreshJob, onGenerationStart, writerInstructions]);

  // Cancel an active backend generation
  const handleCancelGeneration = useCallback(async () => {
    if (!activeJob) return;
    try {
      await cancelGenerationJob(activeJob.id);
      await refreshJob();
    } catch (err) {
      console.error('Failed to cancel generation:', err);
    }
  }, [activeJob, refreshJob]);

  // When backend job completes, notify parent and clear loading state
  useEffect(() => {
    if (activeJob?.status === 'completed') {
      setLoadingStep(null);
      if (activeJob.job_type === 'full_brief') {
        // Full brief finished — navigate to dashboard
        setCurrentView('dashboard');
      } else if (activeJob.job_type === 'regenerate') {
        // Regenerate finished — fetch the latest brief data from DB to catch any
        // Realtime events that were dropped due to the job completing before the
        // brief data update arrived (race condition between the two channels).
        if (briefId) {
          getBrief(briefId).then(({ data: brief }) => {
            if (brief?.brief_data) {
              setBriefData(brief.brief_data as Partial<ContentBrief>);
            }
            if (brief?.stale_steps) {
              setStaleSteps(new Set(brief.stale_steps));
            }
          }).catch(err => {
            console.error('Failed to refresh brief data after regenerate:', err);
          });
        }
      } else if (activeJob.job_type === 'article') {
        // Article generation finished — fetch the saved article and navigate
        setIsLoading(false);
        setGenerationProgress(null);
        if (briefId) {
          getCurrentArticle(briefId).then(({ data: article }) => {
            if (article) {
              setGeneratedArticle({ title: article.title, content: article.content });
              setGeneratedArticleDbId(article.id);
              setCurrentView('article_view');
            }
          }).catch(err => {
            console.error('Failed to fetch generated article:', err);
          });
        }
      } else if (activeJob.job_type === 'competitors') {
        // Competitor analysis finished — reload competitors from DB
        setIsLoading(false);
        if (briefId) {
          getCompetitorsForBrief(briefId).then(({ data: dbCompetitors }) => {
            if (dbCompetitors) {
              setCompetitorData(toCompetitorPages(dbCompetitors));
            }
          }).catch(err => {
            console.error('Failed to load competitors after backend analysis:', err);
          });
          // Load PAA questions from brief
          getBrief(briefId).then(({ data: brief }) => {
            if (brief?.paa_questions) {
              setPaaQuestions(brief.paa_questions);
            }
          }).catch(err => {
            console.error('Failed to load PAA questions:', err);
          });
        }
      }
      if (briefId && onGenerationComplete) {
        onGenerationComplete(briefId, shouldMarkBriefCompleteOnJobCompletion(activeJob.job_type));
      }
    } else if (activeJob?.status === 'failed') {
      setLoadingStep(null);
      setIsLoading(false);
      setGenerationProgress(null);
      setError(activeJob.error_message || 'Backend generation failed');
      if (briefId && onGenerationComplete) {
        onGenerationComplete(briefId, false);
      }
    }
  }, [activeJob?.status, activeJob?.job_type, activeJob?.error_message, briefId, onGenerationComplete]);

  // Propagate backend progress to parent (use ref to avoid re-render loop —
  // onGenerationProgress can change on every render if not memoized by the caller)
  const onGenerationProgressRef2 = useRef(onGenerationProgress);
  useEffect(() => { onGenerationProgressRef2.current = onGenerationProgress; }, [onGenerationProgress]);
  useEffect(() => {
    if (isBackendGenerating && backendCurrentStep && onGenerationProgressRef2.current) {
      onGenerationProgressRef2.current(backendCurrentStep);
    }
  }, [isBackendGenerating, backendCurrentStep]);

  // Map backend article progress to generationProgress for ContentGenerationScreen
  useEffect(() => {
    if (isBackendGenerating && activeJob?.job_type === 'article' && backendProgress) {
      const section = backendProgress.current_section;
      const index = backendProgress.current_index;
      const total = backendProgress.total_sections;
      if (section && index != null && total != null) {
        setGenerationProgress({
          currentSection: section,
          currentIndex: index,
          total: total,
        });
      }
    }
  }, [isBackendGenerating, activeJob?.job_type, backendProgress]);

  // Load brief data when briefId is provided (Supabase mode)
  useEffect(() => {
    const loadExistingBrief = async () => {
      if (!briefId) return;

      setIsLoading(true);
      const loadedState = await loadBrief(briefId);

      if (loadedState) {
        // Restore all state from the loaded brief
        setCurrentView(loadedState.currentView as AppView);
        setBriefingStep(loadedState.briefingStep);
        setBriefData(loadedState.briefData);
        setStaleSteps(loadedState.staleSteps);
        setUserFeedbacks(loadedState.userFeedbacks);
        setPaaQuestions(loadedState.paaQuestions);
        setSubjectInfo(loadedState.subjectInfo);
        setBrandInfo(loadedState.brandInfo);
        setOutputLanguage(loadedState.outputLanguage);
        setSerpLanguage(loadedState.serpLanguage);
        setSerpCountry(loadedState.serpCountry);
        setCompetitorData(loadedState.competitorData);
        setExtractedTemplate(loadedState.extractedTemplate);
        setLengthConstraints(loadedState.lengthConstraints);
        setModelSettingsState(loadedState.modelSettings);
        setBriefStatus(loadedState.briefStatus);

        // Build keyword volume map from loaded keywords
        if (loadedState.keywords && loadedState.keywords.length > 0) {
          const volumeMap = new Map<string, number>();
          loadedState.keywords.forEach((k) => volumeMap.set(k.kw.toLowerCase(), k.volume));
          setKeywordVolumeMap(volumeMap);
          setTopKeywordsForViz(loadedState.keywords.slice(0, 5));
        }

        // Set the most recent article as generated article if available
        const currentArticle = loadedState.articles.find((a) => a.isCurrent);
        if (currentArticle) {
          setGeneratedArticle({ title: currentArticle.title, content: currentArticle.content });
        }
      }

      setIsLoading(false);
    };

    loadExistingBrief();
  }, [briefId, loadBrief]);

  // Mark state as unsaved when relevant data changes
  useEffect(() => {
    if (briefId) {
      setInternalSaveStatus('unsaved');
    }
  }, [
    briefData,
    briefingStep,
    staleSteps,
    userFeedbacks,
    subjectInfo,
    brandInfo,
    briefId,
    // Include new fields
    outputLanguage,
    serpLanguage,
    serpCountry,
    modelSettings,
    lengthConstraints,
    topKeywordsForViz,
    extractedTemplate,
  ]);

  // Toggle animated background when loading
  useEffect(() => {
    document.body.setAttribute('data-loading', isLoading.toString());
  }, [isLoading]);

  const addToast = useCallback((title: string, message: string) => {
    setToasts(prev => [...prev, { id: Date.now(), title, message }]);
  }, []);
  
  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAnalysisLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleStartAnalysis = useCallback(async (
    keywords: { kw: string; volume: number }[],
    country: string,
    serpLanguage: string,
    outputLanguage: string,
    modelSettings?: ModelSettings,
    newLengthConstraints?: LengthConstraints,
    templateUrl?: string,
  ) => {
    setError(null);
    setAnalysisLogs([]);
    setIsLoading(true);
    setCurrentView('context_input');
    setSerpLanguage(serpLanguage);
    setOutputLanguage(outputLanguage);
    setSerpCountry(country);

    // Feature 6: Apply model settings
    if (modelSettings) {
      setModelSettings(modelSettings); // geminiService setter
      setModelSettingsState(modelSettings); // local state for auto-save
    }

    // Feature 3: Store length constraints
    if (newLengthConstraints) {
      setLengthConstraints(newLengthConstraints);
    }

    if (!hasCompletedFirstBrief) {
      addToast("Accolade Unlocked!", "First Strike: You've initiated your first strategic analysis.");
      setHasCompletedFirstBrief(true);
    }

    // Update brief name to primary keyword (makes it meaningful in the dashboard)
    if (briefId && keywords.length > 0) {
      const primaryKeyword = [...keywords].sort((a, b) => b.volume - a.volume)[0].kw;
      updateBrief(briefId, { name: primaryKeyword }).catch(err => {
        console.error('Failed to update brief name:', err);
      });
    }

    // Notify parent that competitor analysis is starting
    if (briefId && onGenerationStart) {
      onGenerationStart('competitors', briefId);
    }

    try {
      if (keywords.length === 0) {
        throw new Error("No keywords provided or parsed. Please check your input.");
      }

      // Feature 1: Extract template from URL if provided
      if (templateUrl) {
        addLog(`Extracting template structure from ${templateUrl}...`);
        try {
          const template = await extractTemplateFromUrl(templateUrl, outputLanguage);
          setExtractedTemplate(template);
          addLog(`Template extracted: ${template.headingStructure.length} top-level headings found.`);
        } catch (templateError) {
          addLog(`Warning: Could not extract template: ${templateError instanceof Error ? templateError.message : 'Unknown error'}. Continuing without template.`);
        }
      }

      const newVolumeMap = new Map<string, number>();
      keywords.forEach(k => newVolumeMap.set(k.kw.toLowerCase(), k.volume));
      setKeywordVolumeMap(newVolumeMap);
      setTopKeywordsForViz([...keywords].sort((a, b) => b.volume - a.volume).slice(0, 5));

      if (!briefId) {
        throw new Error("Cannot start analysis without a brief ID.");
      }

      // Delegate to Edge Function
      addLog(`Starting backend competitor analysis for ${keywords.length} keywords...`);

      // Save current state first so the job snapshot is up to date
      await saveNow();

      // Build keyword volumes map
      const keywordVolumes: Record<string, number> = {};
      for (const k of keywords) {
        keywordVolumes[k.kw] = k.volume;
      }

      const { jobId } = await createGenerationJob(briefId, 'competitors', {
        keywords: keywords.map(k => k.kw),
        keywordVolumes,
        country,
        serpLanguage,
        outputLanguage,
      });
      console.log('Started backend competitor analysis job:', jobId);
      await refreshJob();
      setIsLoading(false); // Backend handles the work, no need for frontend loading
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown analysis error occurred.';
      setError(errorMessage);
      addLog(`Error: ${errorMessage}`);
      setCurrentView('initial_input');

      // Notify parent that competitor analysis failed
      if (briefId && onGenerationComplete) {
        onGenerationComplete(briefId, false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [hasCompletedFirstBrief, addToast, briefId, onGenerationStart, onGenerationComplete, saveNow, refreshJob]);

  const parseFile = useCallback((file: File): Promise<{ content: string | null; error: string | null }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'txt' || fileExtension === 'md') {
        reader.onload = (e) => resolve({ content: e.target?.result as string, error: null });
        reader.onerror = () => resolve({ content: null, error: 'Failed to read text file.' });
        reader.readAsText(file);
        return;
      }
      
      if (fileExtension === 'pdf' || fileExtension === 'docx') {
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            if (fileExtension === 'pdf') {
              // Wait for the library to be available on the window object
              const pdfjsLib = await waitForLibrary<any>('pdfjsLib');
              
              const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
              let text = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                text += textContent.items.map((item: any) => item.str).join(' ');
              }
              resolve({ content: text, error: null });

            } else { // .docx
              // Wait for the library to be available
              const mammoth = await waitForLibrary<any>('mammoth');
              
              const result = await mammoth.extractRawText({ arrayBuffer });
              resolve({ content: result.value, error: null });
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            // Check if the error is from waitForLibrary timing out
            if (errorMessage.includes('failed to load within')) {
                // The library didn't appear on the window object in time.
                // This is almost certainly because the <script> tag in index.html failed to load.
                resolve({ content: null, error: `The parsing library failed to load from the CDN. This may be due to a network issue, a browser extension blocking scripts, or a Content Security Policy in your development environment. This is common in some dev environments and usually works in production.` });
            } else {
                // A different error occurred during parsing itself.
                resolve({ content: null, error: `Error parsing ${file.name}: ${errorMessage}` });
            }
          }
        };
        reader.onerror = () => resolve({ content: null, error: `Failed to read file: ${file.name}` });
        reader.readAsArrayBuffer(file);
        return;
      }
      
      resolve({ content: null, error: 'Unsupported file type. Only PDF, DOCX, TXT, MD are supported.' });
    });
  }, []);
  
  const addContextFiles = useCallback(async (files: File[]) => {
    const filesToParse: File[] = [];

    // Use functional updates to avoid depending on contextFiles/fileContents
    setContextFiles(prev => {
      const newMap = new Map(prev);
      for (const file of files) {
        if (!newMap.has(file.name)) {
          newMap.set(file.name, file);
          if (file.size <= MAX_FILE_SIZE_BYTES) {
            filesToParse.push(file);
          }
        }
      }
      if (newMap.size >= 3 && !hasAchievedDataMaven) {
        addToast("Accolade Unlocked!", "Data Maven: You've provided 3+ context files for superior accuracy.");
        setHasAchievedDataMaven(true);
      }
      return newMap;
    });

    // Set error status for oversized files
    setFileContents(prev => {
      const newMap = new Map(prev);
      for (const file of files) {
        if (!newMap.has(file.name) && file.size > MAX_FILE_SIZE_BYTES) {
          newMap.set(file.name, {
            content: null,
            error: `File is too large (max ${MAX_FILE_SIZE_MB}MB).`,
            status: 'done'
          });
        }
      }
      return newMap;
    });

    await Promise.all(filesToParse.map(async (file) => {
        try {
            setFileContents(prev => new Map(prev).set(file.name, { content: null, error: null, status: 'parsing' }));
            const result = await parseFile(file);
            setFileContents(prev => new Map(prev).set(file.name, { ...result, status: 'done' }));

            // Save to database
            if (briefId) {
                try {
                    await uploadContextFile(briefId, file, result.content || undefined);
                } catch (err) {
                    console.error('Failed to save context file to database:', err);
                }
            }
        } catch (err) {
            console.error(`Error processing file ${file.name}:`, err);
            setFileContents(prev => new Map(prev).set(file.name, { content: null, error: String(err), status: 'done' }));
        }
    }));
  }, [parseFile, addToast, hasAchievedDataMaven, briefId]);

  const removeContextFile = useCallback((fileName: string) => {
    setContextFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileName);
        return newMap;
    });
    setFileContents(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileName);
        return newMap;
    });
  }, []);
  
  const addContextUrl = useCallback(async (url: string) => {
    if (!url || urlContents.has(url)) {
        return;
    }
    // Basic URL validation
    try {
        new URL(url);
    } catch (_) {
        setUrlContents(prev => new Map(prev).set(url, { content: null, error: 'Invalid URL format.', status: 'done' }));
        return;
    }

    setUrlContents(prev => new Map(prev).set(url, { content: null, error: null, status: 'scraping' }));

    try {
        const onpageData = await dataforseoService.getOnPageElementsViaProxy(url);
        if (onpageData.Full_Text && onpageData.Full_Text !== "Could not parse the JSON response." && onpageData.H1s[0] !== "PARSE_FAILED") {
            setUrlContents(prev => new Map(prev).set(url, { content: onpageData.Full_Text, error: null, status: 'done' }));

            // Save to database
            if (briefId) {
                try {
                    await addContextUrlToDb(briefId, url, onpageData.Full_Text);
                } catch (err) {
                    console.error('Failed to save context URL to database:', err);
                }
            }
        } else {
            throw new Error(onpageData.Full_Text || "Scraping returned no text content or failed.");
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown scraping error occurred.';
        setUrlContents(prev => new Map(prev).set(url, { content: null, error: errorMessage, status: 'done' }));
    }
  }, [urlContents, briefId]);

  const removeContextUrl = useCallback((url: string) => {
    setUrlContents(prev => {
        const newMap = new Map(prev);
        newMap.delete(url);
        return newMap;
    });
  }, []);


  // Derive client branding from profile for Header + Sidebar
  const clientLogoUrl = React.useMemo(
    () => getClientLogoUrl(clientProfile?.brand_identity),
    [clientProfile?.brand_identity]
  );
  const clientBrandColor = React.useMemo(
    () => clientProfile?.brand_identity?.brand_color || null,
    [clientProfile?.brand_identity?.brand_color]
  );

  const brandContextForArticle = React.useMemo(() => {
    if (!clientProfile) return undefined;
    return formatForArticleGeneration(clientProfile);
  }, [clientProfile]);

  const handleProceedToVisualization = useCallback(() => {
    setCurrentView('visualization');
  }, []);

  const handleToggleStar = useCallback((url: string) => {
    setCompetitorData(prevData => 
      prevData.map(c => 
        c.URL === url ? { ...c, is_starred: !c.is_starred } : c
      )
    );
  }, []);

  // After competitor analysis, kick off the full_brief backend job and
  // route the user to the dashboard. The dashboard fills in live as each
  // step completes via Realtime.
  const handleProceedToBriefing = useCallback(async () => {
    if (!briefId) return;

    // Combine uploaded file + scraped URL contexts into the saved subject info so
    // the backend job snapshot includes them.
    const fileContexts = Array.from(fileContents.entries())
      .filter(([, f]) => f.status === 'done' && f.content)
      .map(([, f]) => f.content as string);

    const urlContexts = Array.from(urlContents.entries())
      .filter(([, u]) => u.status === 'done' && u.content)
      .map(([url, u]) => `SOURCE URL: ${url}\n\n${u.content as string}`);

    let combinedSubjectInfoLocal = subjectInfo;
    if (fileContexts.length > 0) {
      combinedSubjectInfoLocal += `\n\n### Additional Context from Files:\n\n` + fileContexts.join('\n\n---\n\n');
    }
    if (urlContexts.length > 0) {
      combinedSubjectInfoLocal += `\n\n### Additional Context from Scraped URLs:\n\n` + urlContexts.join('\n\n---\n\n');
    }

    setCombinedSubjectInfo(combinedSubjectInfoLocal.trim());
    setCurrentView('dashboard');
    await handleBackendFullBrief();
  }, [briefId, subjectInfo, fileContents, urlContents, handleBackendFullBrief]);

  const handleFeelingLucky = useCallback(() => {
    handleProceedToBriefing();
  }, [handleProceedToBriefing]);

  const onGenerationProgressRef = useRef(onGenerationProgress);
  useEffect(() => { onGenerationProgressRef.current = onGenerationProgress; }, [onGenerationProgress]);

  const handleRegenerateStep = useCallback(async (logicalStepToRegen: number, feedback?: string) => {
    setError(null);
    if (logicalStepToRegen < 1 || logicalStepToRegen > 7) return;
    if (!briefId) return;
    setLoadingStep(logicalStepToRegen);
    await handleBackendRegenerate(logicalStepToRegen, feedback);
  }, [briefId, handleBackendRegenerate]);
  
  const handleUserFeedbackChange = (step: number, value: string) => {
    setUserFeedbacks(prev => ({ ...prev, [step]: value }));
  };
  
  const handleWorkflowStatusChange = useCallback(async (newStatus: string, metadata?: { published_url?: string; published_at?: string }) => {
    if (!briefId) return;
    const prev = briefStatus;
    setBriefStatus(newStatus as BriefStatus);
    const { error } = await updateBriefWorkflowStatus(briefId, newStatus as BriefStatus, metadata);
    if (error) {
      console.error('Failed to update workflow status:', error);
      setBriefStatus(prev);
    }
  }, [briefId, briefStatus]);

  const handleStartContentGeneration = async () => {
    if (!briefData.article_structure) {
      setError("Cannot generate content without an article structure in the brief.");
      return;
    }

    if (!briefId) {
      setError("Cannot generate content without a brief ID.");
      return;
    }

    setError(null);
    setCurrentView('content_generation');
    setIsLoading(true);
    setGeneratedArticleDbId(null);
    setGeneratedArticle(null);
    await handleBackendArticleGeneration();
  };

  // Feature F2: Handle paragraph-level regeneration in generated content with enhanced context
  const handleParagraphRegenerate = useCallback(async (
    fullContent: string,
    lineIndex: number,
    feedback: string
  ): Promise<string> => {
    const lines = fullContent.split('\n');
    const targetParagraph = lines[lineIndex];

    // Find context before and after the paragraph
    const beforeLines: string[] = [];
    const afterLines: string[] = [];

    // Get up to 5 lines before (more context)
    for (let i = lineIndex - 1; i >= 0 && beforeLines.length < 5; i--) {
      if (lines[i].trim() && !lines[i].startsWith('#')) {
        beforeLines.unshift(lines[i]);
      }
    }

    // Get up to 5 lines after (more context)
    for (let i = lineIndex + 1; i < lines.length && afterLines.length < 5; i++) {
      if (lines[i].trim() && !lines[i].startsWith('#')) {
        afterLines.push(lines[i]);
      }
    }

    // Find the current section heading for context
    let currentSection = '';
    let sectionHeading = '';
    for (let i = lineIndex - 1; i >= 0; i--) {
      if (lines[i].startsWith('#')) {
        currentSection = lines[i];
        sectionHeading = lines[i].replace(/^#+\s*/, ''); // Remove # markers
        break;
      }
    }

    // Find matching section in brief to get guidelines
    let sectionGuidelines: string[] = [];
    if (briefData.article_structure) {
      const findSection = (items: OutlineItem[]): OutlineItem | undefined => {
        for (const item of items) {
          if (item.heading.toLowerCase().includes(sectionHeading.toLowerCase()) ||
              sectionHeading.toLowerCase().includes(item.heading.toLowerCase())) {
            return item;
          }
          if (item.children) {
            const found = findSection(item.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      const matchedSection = findSection(briefData.article_structure.outline);
      if (matchedSection) {
        sectionGuidelines = matchedSection.guidelines;
      }
    }

    const newParagraph = await regenerateParagraph(
      currentSection,
      targetParagraph,
      beforeLines.join('\n'),
      afterLines.join('\n'),
      feedback,
      outputLanguage,
      sectionGuidelines,
      sectionHeading
    );

    return newParagraph;
  }, [outputLanguage, briefData.article_structure]);

  const handleRestart = async () => {
    // Save current state before clearing (prevents data loss)
    if (briefId) {
      await saveNow();
    }

    // Pause auto-save to prevent saving empty state after clearing
    pauseAutoSave();

    setCurrentView('initial_input');
    setBriefData({});
    setError(null);
    setSubjectInfo('');
    setCombinedSubjectInfo('');
    setBrandInfo('');
    setAnalysisLogs([]);
    setKeywordVolumeMap(new Map());
    setCompetitorData([]);
    setTopKeywordsForViz([]);
    setBriefingStep(1);
    setStaleSteps(new Set());
    setUserFeedbacks({});
    setSerpLanguage('English');
    setOutputLanguage('English');
    setSerpCountry('United States');
    setContextFiles(new Map());
    setFileContents(new Map());
    setUrlContents(new Map());
    setGeneratedArticle(null);
    setGeneratedArticleDbId(null);
    setGenerationProgress(null);
    setWriterInstructions('');
    setHasAchievedDataMaven(false); // Reset achievement
    setPaaQuestions([]); // Reset PAA questions
    setExtractedTemplate(null); // Reset template
    setModelSettingsState(null); // Reset model settings
    setLengthConstraints({ globalTarget: null, sectionTargets: {}, strictMode: false }); // Reset constraints
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'initial_input':
        return <InitialInputScreen
                  onStartAnalysis={handleStartAnalysis}
                  isLoading={isLoading}
                  error={error}
                />;
      case 'context_input':
        return <ContextInputScreen
                  subjectInfo={subjectInfo}
                  setSubjectInfo={setSubjectInfo}
                  brandInfo={brandInfo}
                  setBrandInfo={setBrandInfo}
                  analysisLogs={analysisLogs}
                  isLoading={isLoading}
                  onContinue={handleProceedToVisualization}
                  contextFiles={Array.from(contextFiles.values())}
                  fileContents={fileContents}
                  onAddFiles={addContextFiles}
                  onRemoveFile={removeContextFile}
                  urlContents={urlContents}
                  onAddUrl={addContextUrl}
                  onRemoveUrl={removeContextUrl}
                  inheritedBrandContext={clientProfile ? buildBrandContext(clientProfile, clientProfile.context_files, clientProfile.context_urls) : undefined}
                  clientName={clientName || undefined}
                  generationProgress={backendProgress || undefined}
                  isBackendGenerating={isBackendGenerating && activeJob?.job_type === 'competitors'}
                  analysisComplete={activeJob?.job_type === 'competitors' && activeJob?.status === 'completed'}
                  competitorCount={competitorData.length}
                 />;
      case 'visualization':
        return <CompetitionVizScreen 
                  competitorData={competitorData} 
                  topKeywords={topKeywordsForViz} 
                  onProceed={handleProceedToBriefing}
                  onToggleStar={handleToggleStar}
                  onFeelingLucky={handleFeelingLucky}
                />;
      case 'dashboard':
        return <DashboardScreen
                  briefData={briefData}
                  setBriefData={setBriefData}
                  staleSteps={staleSteps}
                  userFeedbacks={userFeedbacks}
                  onFeedbackChange={handleUserFeedbackChange}
                  onRegenerate={handleRegenerateStep}
                  onRestart={handleRestart}
                  isLoading={isLoading || isBackendJobActive}
                  loadingStep={loadingStep || (isBackendJobActive ? backendCurrentStep : null)}
                  competitorData={competitorData}
                  keywordVolumeMap={keywordVolumeMap}
                  onStartContentGeneration={handleStartContentGeneration}
                  writerInstructions={writerInstructions}
                  setWriterInstructions={setWriterInstructions}
                  // Fun factor props
                  subjectInfo={subjectInfo}
                  brandInfo={brandInfo}
                  contextFiles={Array.from(contextFiles.values())}
                  outputLanguage={outputLanguage}
                  // Save status
                  saveStatus={saveStatus}
                  lastSavedAt={lastSavedAt}
                  // Lifted sidebar state
                  selectedSection={dashboardSection}
                  onSelectSection={setDashboardSection}
                  // Workflow status
                  briefId={briefId || undefined}
                  briefStatus={briefStatus}
                  onWorkflowStatusChange={handleWorkflowStatusChange}
                  // Backend generation state — drives the generation banner
                  isBackendGenerating={isBackendGenerating}
                  backendJobType={activeJob?.job_type || null}
                  backendProgress={backendProgress}
                  backendStepName={backendStepName}
                  backendCurrentStep={backendCurrentStep}
                  onCancelBackendGeneration={handleCancelGeneration}
                />;
      case 'article_view':
          if (!generatedArticle) return null;
          return <ArticleScreen
            article={generatedArticle}
            articleDbId={generatedArticleDbId || undefined}
            briefData={briefData}
            lengthConstraints={lengthConstraints}
            language={outputLanguage}
            onBack={() => setCurrentView('dashboard')}
            onArticleChange={(updated) => setGeneratedArticle(updated)}
            onBriefDataChange={(updates) => setBriefData(prev => ({ ...prev, ...updates }))}
            brandContext={brandContextForArticle}
          />;
      case 'content_generation':
          return <ContentGenerationScreen
              isLoading={isLoading}
              progress={generationProgress}
              article={generatedArticle}
              setArticle={setGeneratedArticle}
              error={error}
              onBack={() => setCurrentView('dashboard')}
              onRegenerateParagraph={handleParagraphRegenerate}
              language={outputLanguage}
              briefData={briefData}
              lengthConstraints={lengthConstraints}
              onArticleReady={() => setCurrentView('article_view')}
              brandContext={brandContextForArticle}
          />
      default:
        return <InitialInputScreen
                  onStartAnalysis={handleStartAnalysis}
                  isLoading={isLoading}
                  error={error}
               />;
    }
  };

  return (
    <SoundProvider>
        <div className="min-h-screen bg-background text-gray-600 font-sans flex flex-col">
        <Header
          clientName={clientName}
          clientLogoUrl={clientLogoUrl}
          clientBrandColor={clientBrandColor}
          onBackToBriefList={onBackToBriefList}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
        />
        <div className="flex-1 flex overflow-hidden">
            <Sidebar
              currentView={currentView}
              selectedSection={dashboardSection}
              onSelectSection={setDashboardSection}
              staleSteps={staleSteps}
              clientLogoUrl={clientLogoUrl}
              clientBrandColor={clientBrandColor}
              clientName={clientName || undefined}
            />
            <main className="flex-1 overflow-y-auto">
              <div className="p-6 lg:p-8">
                {renderCurrentView()}
              </div>
            </main>
        </div>
        <div className="toast-container">
            {toasts.map(toast => (
            <Toast key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
            ))}
        </div>
        </div>
    </SoundProvider>
  );
};

export default App;
