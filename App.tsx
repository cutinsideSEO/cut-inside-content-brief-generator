import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import Header from './components/Header';
import { generateBriefStep, generateArticleSection, setModelSettings, regenerateParagraph } from './services/geminiService';
import * as dataforseoService from './services/dataforseoService';
import { parseMarkdownBrief } from './services/markdownParserService';
import { extractTemplateFromUrl } from './services/templateExtractionService';
import type { CompetitorPage, ContentBrief, CompetitorRanking, OutlineItem, ModelSettings, LengthConstraints, ExtractedTemplate, HeadingNode } from './types';
import { UI_TO_LOGICAL_STEP_MAP, SOUND_EFFECTS } from './constants';
import { BrainCircuitIcon } from './components/Icon';

// Import the new screen components
import InitialInputScreen from './components/screens/InitialInputScreen';
import ContextInputScreen from './components/screens/ContextInputScreen';
import CompetitionVizScreen from './components/screens/CompetitionVizScreen';
import BriefingScreen from './components/screens/BriefingScreen';
import DashboardScreen from './components/screens/DashboardScreen';
import ContentGenerationScreen from './components/screens/ContentGenerationScreen';
import BriefUploadScreen from './components/screens/BriefUploadScreen';

// Import Supabase integration components
import SaveStatusIndicator from './components/SaveStatusIndicator';
import { useBriefLoader } from './hooks/useBriefLoader';
import { useAutoSave } from './hooks/useAutoSave';
import { saveBriefState, updateBriefProgress, updateBriefStatus } from './services/briefService';
import { saveCompetitors } from './services/competitorService';
import { createArticle } from './services/articleService';
import type { SaveStatus } from './types/appState';

type AppView = 'initial_input' | 'context_input' | 'visualization' | 'briefing' | 'dashboard' | 'content_generation' | 'brief_upload';
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
  isSupabaseMode?: boolean;
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
    <div className="toast bg-teal/90 backdrop-blur-sm border border-teal/50 text-brand-white p-4 rounded-lg shadow-lg w-80">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <BrainCircuitIcon className="h-6 w-6 text-yellow" />
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
  isSupabaseMode = false,
}) => {
  const [currentView, setCurrentView] = useState<AppView>('initial_input');
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
  const [brandInfo, setBrandInfo] = useState('');
  const [keywordVolumeMap, setKeywordVolumeMap] = useState<Map<string, number>>(new Map());
  const [competitorData, setCompetitorData] = useState<CompetitorPage[]>([]);
  const [topKeywordsForViz, setTopKeywordsForViz] = useState<{ kw: string, volume: number }[]>([]);
  const [briefData, setBriefData] = useState<Partial<ContentBrief>>({});
  const [serpLanguage, setSerpLanguage] = useState('English');
  const [outputLanguage, setOutputLanguage] = useState('English');
  const [apiLogin, setApiLogin] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  
  // File context state
  const [contextFiles, setContextFiles] = useState<Map<string, File>>(new Map());
  const [fileContents, setFileContents] = useState<Map<string, { content: string | null; error: string | null; status: 'pending' | 'parsing' | 'done' }>>(new Map());
  const [urlContents, setUrlContents] = useState<Map<string, { content: string | null; error: string | null; status: 'pending' | 'scraping' | 'done' }>>(new Map());

  // Briefing & Dashboard state
  const [briefingStep, setBriefingStep] = useState(1);
  const [staleSteps, setStaleSteps] = useState<Set<number>>(new Set());
  const [userFeedbacks, setUserFeedbacks] = useState<{ [key: number]: string }>({});
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [isUploadedBrief, setIsUploadedBrief] = useState<boolean>(false);
  const [writerInstructions, setWriterInstructions] = useState<string>('');

  // Content generation state
  const [generatedArticle, setGeneratedArticle] = useState<{ title: string; content: string } | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{ currentSection: string; currentIndex: number; total: number } | null>(null);

  // "I'm Feeling Lucky" flow state
  const [isFeelingLuckyFlow, setIsFeelingLuckyFlow] = useState<boolean>(false);

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

  // Feature: PAA (People Also Ask) questions collected from SERPs
  const [paaQuestions, setPaaQuestions] = useState<string[]>([]);

  // Brief loader hook
  const { loadBrief, isLoading: isBriefLoading } = useBriefLoader();

  // Auto-save hook (only active in Supabase mode)
  const { triggerSave, saveNow } = useAutoSave(
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
    },
    {
      briefId: briefId || null,
      enabled: isSupabaseMode && Boolean(briefId),
      debounceMs: 2000,
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

  // Load brief data when briefId is provided (Supabase mode)
  useEffect(() => {
    const loadExistingBrief = async () => {
      if (!briefId || !isSupabaseMode) return;

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
        setCompetitorData(loadedState.competitorData);
        setExtractedTemplate(loadedState.extractedTemplate);
        setLengthConstraints(loadedState.lengthConstraints);

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
  }, [briefId, isSupabaseMode, loadBrief]);

  // Mark state as unsaved when relevant data changes (Supabase mode)
  useEffect(() => {
    if (isSupabaseMode && briefId) {
      setInternalSaveStatus('unsaved');
    }
  }, [briefData, briefingStep, staleSteps, userFeedbacks, subjectInfo, brandInfo, isSupabaseMode, briefId]);

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

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getGroundTruthCompetitors = (competitors: CompetitorPage[]): CompetitorPage[] => {
    const starred = competitors.filter(c => c.is_starred);
    // Assuming competitors are already sorted by score descending
    const notStarred = competitors.filter(c => !c.is_starred);

    const topCompetitors = [...starred];
    
    let i = 0;
    while(topCompetitors.length < 3 && i < notStarred.length) {
        if (!topCompetitors.some(c => c.URL === notStarred[i].URL)) {
            topCompetitors.push(notStarred[i]);
        }
        i++;
    }

    return topCompetitors.slice(0, 3);
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAnalysisLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleStartAnalysis = useCallback(async (
    keywords: { kw: string; volume: number }[],
    login: string,
    password: string,
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
    setApiLogin(login);
    setApiPassword(password);

    // Feature 6: Apply model settings
    if (modelSettings) {
      setModelSettings(modelSettings);
    }

    // Feature 3: Store length constraints
    if (newLengthConstraints) {
      setLengthConstraints(newLengthConstraints);
    }

    if (!hasCompletedFirstBrief) {
      addToast("Accolade Unlocked!", "First Strike: You've initiated your first strategic analysis.");
      setHasCompletedFirstBrief(true);
    }

    try {
      if (keywords.length === 0) {
        throw new Error("No keywords provided or parsed. Please check your input.");
      }

      // Feature 1: Extract template from URL if provided
      if (templateUrl) {
        addLog(`Extracting template structure from ${templateUrl}...`);
        try {
          const template = await extractTemplateFromUrl(templateUrl, login, password, outputLanguage);
          setExtractedTemplate(template);
          addLog(`Template extracted: ${template.headingStructure.length} top-level headings found.`);
        } catch (templateError) {
          addLog(`Warning: Could not extract template: ${templateError instanceof Error ? templateError.message : 'Unknown error'}. Continuing without template.`);
        }
      }

      const newVolumeMap = new Map<string, number>();
      keywords.forEach(k => newVolumeMap.set(k.kw.toLowerCase(), k.volume));
      setKeywordVolumeMap(newVolumeMap);
      setTopKeywordsForViz(keywords.sort((a, b) => b.volume - a.volume).slice(0, 5));
      addLog(`Found ${keywords.length} keywords. Starting SERP analysis for ${country} in ${serpLanguage}.`);

      const urlDataMap = new Map<string, { rankings: CompetitorRanking[], score: number }>();
      const collectedPaaQuestions: string[] = [];

      for (let i = 0; i < keywords.length; i++) {
        const { kw, volume } = keywords[i];
        addLog(`Fetching SERP for "${kw}" (${i + 1}/${keywords.length})...`);
        const serpResponse = await dataforseoService.getSerpUrls(kw, login, password, country, serpLanguage);

        // Collect PAA questions (deduplicated)
        for (const paaQuestion of serpResponse.paaQuestions) {
          if (!collectedPaaQuestions.includes(paaQuestion)) {
            collectedPaaQuestions.push(paaQuestion);
          }
        }

        serpResponse.urls.forEach(result => {
          if (!result.url) return;
          if (!urlDataMap.has(result.url)) {
            urlDataMap.set(result.url, { rankings: [], score: 0 });
          }
          const data = urlDataMap.get(result.url)!;
          data.rankings.push({ keyword: kw, rank: result.rank, volume });
          const rankWeight = Math.max(0, 11 - result.rank);
          data.score += volume * rankWeight;
        });
        await sleep(1000);
      }

      // Store collected PAA questions
      if (collectedPaaQuestions.length > 0) {
        setPaaQuestions(collectedPaaQuestions);
        addLog(`Collected ${collectedPaaQuestions.length} "People Also Ask" questions from SERPs.`);
      }
      addLog('All SERP data fetched.');
      addLog("Calculating competitor strength scores...");

      const sortedUrls = Array.from(urlDataMap.entries())
        .sort(([, dataA], [, dataB]) => dataB.score - dataA.score)
        .slice(0, 10);
      addLog(`Identified top ${sortedUrls.length} competitors. Starting on-page analysis.`);

      const finalCompetitorData: CompetitorPage[] = [];
      for (let i = 0; i < sortedUrls.length; i++) {
        const [url, data] = sortedUrls[i];
        addLog(`Analyzing ${url.substring(0, 50)}... (${i + 1}/${sortedUrls.length})`);
        const onpageData = await dataforseoService.getDetailedOnpageElements(url, login, password);
        finalCompetitorData.push({
          URL: url,
          Weighted_Score: Math.round(data.score),
          rankings: data.rankings,
          ...onpageData,
          is_starred: false,
        });
        await sleep(1000);
      }
      
      addLog("Analysis complete! You may now add context below or proceed.");
      setCompetitorData(finalCompetitorData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown analysis error occurred.';
      setError(errorMessage);
      addLog(`Error: ${errorMessage}`);
      setCurrentView('initial_input');
    } finally {
      setIsLoading(false);
    }
  }, [hasCompletedFirstBrief, addToast]);

  const handleBriefUpload = useCallback(async (briefFile: File) => {
    setError(null);
    setIsLoading(true);
    try {
      const markdownContent = await briefFile.text();
      const parsedBrief = parseMarkdownBrief(markdownContent);
      setBriefData(parsedBrief);
      setIsUploadedBrief(true);
      setCurrentView('dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during parsing.';
      setError(`Failed to parse brief: ${errorMessage}`);
      setCurrentView('brief_upload'); // Stay on upload screen on error
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  
  const addContextFiles = useCallback((files: File[]) => {
    const newFilesMap = new Map(contextFiles);
    const newContentsMap = new Map(fileContents);
    const filesToParse: File[] = [];

    for (const file of files) {
        if (!newFilesMap.has(file.name)) {
            newFilesMap.set(file.name, file);
            if (file.size > MAX_FILE_SIZE_BYTES) {
                newContentsMap.set(file.name, {
                    content: null,
                    error: `File is too large (max ${MAX_FILE_SIZE_MB}MB).`,
                    status: 'done'
                });
            } else {
                filesToParse.push(file);
            }
        }
    }

    if (newFilesMap.size >= 3 && !hasAchievedDataMaven) {
        addToast("Accolade Unlocked!", "Data Maven: You've provided 3+ context files for superior accuracy.");
        setHasAchievedDataMaven(true);
    }

    setContextFiles(newFilesMap);
    if(newContentsMap.size > fileContents.size) setFileContents(newContentsMap);
    
    filesToParse.forEach(async (file) => {
        setFileContents(prev => new Map(prev).set(file.name, { content: null, error: null, status: 'parsing' }));
        const result = await parseFile(file);
        setFileContents(prev => new Map(prev).set(file.name, { ...result, status: 'done' }));
    });
  }, [contextFiles, fileContents, parseFile, addToast, hasAchievedDataMaven]);

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
        const onpageData = await dataforseoService.getDetailedOnpageElements(url, apiLogin, apiPassword);
        if (onpageData.Full_Text && onpageData.Full_Text !== "Could not parse the JSON response." && onpageData.H1s[0] !== "PARSE_FAILED") {
             setUrlContents(prev => new Map(prev).set(url, { content: onpageData.Full_Text, error: null, status: 'done' }));
        } else {
            throw new Error(onpageData.Full_Text || "Scraping returned no text content or failed.");
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown scraping error occurred.';
        setUrlContents(prev => new Map(prev).set(url, { content: null, error: errorMessage, status: 'done' }));
    }
  }, [urlContents, apiLogin, apiPassword]);

  const removeContextUrl = useCallback((url: string) => {
    setUrlContents(prev => {
        const newMap = new Map(prev);
        newMap.delete(url);
        return newMap;
    });
  }, []);


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

  const handleNextStep = useCallback(async (userFeedback?: string) => {
    setError(null);
    const nextUiStep = briefingStep + 1;
    if (nextUiStep > 7) {
      setCurrentView('dashboard');
      setIsFeelingLuckyFlow(false);
      return;
    }

    setBriefingStep(nextUiStep);
    setIsLoading(true);
    setLoadingStep(nextUiStep);
    try {
      const keywordsWithVolume = Array.from(keywordVolumeMap.entries()).map(([keyword, volume]) => ({ keyword, volume }));
      const logicalNextStep = UI_TO_LOGICAL_STEP_MAP[nextUiStep];
      const groundTruthCompetitors = getGroundTruthCompetitors(competitorData);
      const groundTruthText = groundTruthCompetitors.map(c => `URL: ${c.URL}\nTEXT: ${c.Full_Text}`).join('\n\n---\n\n');

      const result = await generateBriefStep({
        step: logicalNextStep,
        competitorDataJson: JSON.stringify(competitorData),
        subjectInfo,
        brandInfo,
        previousStepsData: briefData,
        groundTruthText,
        userFeedback,
        availableKeywords: nextUiStep === 3 ? keywordsWithVolume : undefined,
        language: outputLanguage,
        // Feature 1 & 3: Pass template and length constraints for step 5 (structure)
        templateHeadings: logicalNextStep === 5 && extractedTemplate ? extractedTemplate.headingStructure : undefined,
        lengthConstraints: lengthConstraints.globalTarget ? lengthConstraints : undefined,
        // Feature: Pass PAA questions for step 6 (FAQ generation)
        paaQuestions: logicalNextStep === 6 ? paaQuestions : undefined,
      });
      setBriefData(prev => ({ ...prev, ...result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setBriefingStep(prev => prev - 1); // Revert on error
      setIsFeelingLuckyFlow(false); // Stop lucky flow on error
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  }, [briefingStep, competitorData, subjectInfo, brandInfo, briefData, keywordVolumeMap, outputLanguage, extractedTemplate, lengthConstraints, paaQuestions]);

  const handleProceedToBriefing = useCallback(async () => {
    setCurrentView('briefing');
    setIsLoading(true);
    setLoadingStep(1);
    try {
      const groundTruthCompetitors = getGroundTruthCompetitors(competitorData);
      const groundTruthText = groundTruthCompetitors.map(c => `URL: ${c.URL}\nTEXT: ${c.Full_Text}`).join('\n\n---\n\n');
      
      const fileContexts = Array.from(fileContents.entries())
        .filter(([, f]) => f.status === 'done' && f.content)
        .map(([, f]) => f.content as string);
      
      const urlContexts = Array.from(urlContents.entries())
        .filter(([, u]) => u.status === 'done' && u.content)
        .map(([url, u]) => `SOURCE URL: ${url}\n\n${u.content as string}`);

      let combinedSubjectInfo = subjectInfo;
      if (fileContexts.length > 0) {
        combinedSubjectInfo += `\n\n### Additional Context from Files:\n\n` + fileContexts.join('\n\n---\n\n');
      }
      if (urlContexts.length > 0) {
        combinedSubjectInfo += `\n\n### Additional Context from Scraped URLs:\n\n` + urlContexts.join('\n\n---\n\n');
      }

      const result = await generateBriefStep({
        step: 1,
        competitorDataJson: JSON.stringify(competitorData),
        subjectInfo: combinedSubjectInfo.trim(),
        brandInfo,
        previousStepsData: {},
        groundTruthText,
        language: outputLanguage,
        lengthConstraints: lengthConstraints.globalTarget ? lengthConstraints : undefined,
      });
      setBriefData(prev => ({ ...prev, ...result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setCurrentView('visualization');
      setIsFeelingLuckyFlow(false); // Stop lucky flow on error
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  }, [competitorData, subjectInfo, brandInfo, fileContents, urlContents, outputLanguage, lengthConstraints]);
  
  const handleFeelingLucky = useCallback(() => {
    setIsFeelingLuckyFlow(true);
    handleProceedToBriefing();
  }, [handleProceedToBriefing]);

  useEffect(() => {
    // This effect drives the "I'm Feeling Lucky" flow forward.
    if (isFeelingLuckyFlow && currentView === 'briefing' && !isLoading && !error) {
        // When a step completes, isLoading becomes false, and this effect triggers.
        // We call handleNextStep, which will either generate the next step
        // or, if all steps are complete (briefingStep will be 7), it will transition to the dashboard.
        if (briefingStep <= 7) {
            handleNextStep();
        }
    }
  }, [isFeelingLuckyFlow, currentView, isLoading, error, briefingStep, briefData, handleNextStep]);
  
  const handleRegenerateStep = useCallback(async (logicalStepToRegen: number, feedback?: string) => {
    setError(null);
    if (logicalStepToRegen < 1 || logicalStepToRegen > 7) return;
    
    setIsLoading(true);
    setLoadingStep(logicalStepToRegen);
    
    try {
      const userFeedback = feedback || userFeedbacks[logicalStepToRegen] || '';
      const keywordsWithVolume = Array.from(keywordVolumeMap.entries()).map(([keyword, volume]) => ({ keyword, volume }));
      const groundTruthCompetitors = getGroundTruthCompetitors(competitorData);
      const groundTruthText = groundTruthCompetitors.map(c => `URL: ${c.URL}\nTEXT: ${c.Full_Text}`).join('\n\n---\n\n');

      const result = await generateBriefStep({
        step: logicalStepToRegen,
        competitorDataJson: JSON.stringify(competitorData),
        subjectInfo,
        brandInfo,
        previousStepsData: briefData,
        groundTruthText,
        userFeedback: userFeedback,
        availableKeywords: logicalStepToRegen === 2 ? keywordsWithVolume : undefined,
        isRegeneration: true,
        language: outputLanguage,
        // Feature: Pass PAA questions for step 6 (FAQ generation)
        paaQuestions: logicalStepToRegen === 6 ? paaQuestions : undefined,
      });
      setBriefData(prev => ({ ...prev, ...result }));

      // Mark dependent steps as stale if we are on the dashboard
      if (currentView === 'dashboard') {
        const dependencies: { [key: number]: number[] } = {
          1: [2, 3, 4, 5, 6, 7],
          2: [4, 5, 6, 7],
          3: [4, 5, 6, 7],
          4: [5, 6, 7],
          5: [6, 7],
          6: [],
          7: [],
        };
        const stepsToMarkStale = dependencies[logicalStepToRegen] || [];
        setStaleSteps(prev => {
            const newStale = new Set(prev);
            stepsToMarkStale.forEach(step => newStale.add(step));
            newStale.delete(logicalStepToRegen);
            return newStale;
        });
        setUserFeedbacks(prev => ({...prev, [logicalStepToRegen]: ''}));
      }

    } catch (err) {
      setError(err instanceof Error ? `Error regenerating step ${logicalStepToRegen}: ${err.message}` : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  }, [currentView, competitorData, subjectInfo, brandInfo, briefData, keywordVolumeMap, userFeedbacks, outputLanguage, paaQuestions]);
  
  const handleUserFeedbackChange = (step: number, value: string) => {
    setUserFeedbacks(prev => ({ ...prev, [step]: value }));
  };
  
  const handleStartContentGeneration = async () => {
    if (!briefData.article_structure) {
      setError("Cannot generate content without an article structure in the brief.");
      return;
    }
    setError(null);
    setCurrentView('content_generation');
    setIsLoading(true);

    const flattenOutline = (items: OutlineItem[]): OutlineItem[] => {
      const flatList: OutlineItem[] = [];
      const recurse = (item: OutlineItem) => {
        flatList.push(item);
        if (item.children) {
          item.children.forEach(recurse);
        }
      };
      items.forEach(recurse);
      return flatList;
    };

    const allSections = flattenOutline(briefData.article_structure.outline);
    let fullContent = '';

    // Initialize with H1
    const initialTitle = briefData.on_page_seo?.h1?.value || briefData.keyword_strategy?.primary_keywords?.[0]?.keyword || "Untitled Article";
    fullContent += `# ${initialTitle}\n\n`;
    setGeneratedArticle({ title: initialTitle, content: fullContent });

    try {
      for (let i = 0; i < allSections.length; i++) {
        const section = allSections[i];
        setGenerationProgress({
          currentSection: section.heading,
          currentIndex: i + 1,
          total: allSections.length,
        });

        const upcomingHeadings = allSections.slice(i + 1, i + 4).map(s => `${'#'.repeat(s.level.startsWith('H') ? parseInt(s.level.substring(1), 10) : 2)} ${s.heading}`);

        const headingLevel = section.level.startsWith('H') ? parseInt(section.level.substring(1), 10) : 2;
        const heading = `${'#'.repeat(headingLevel)} ${section.heading}\n\n`;

        // Add heading before streaming starts
        fullContent += heading;
        setGeneratedArticle({ title: initialTitle, content: fullContent });

        // Use streaming to show real-time content generation
        const sectionContent = await generateArticleSection({
          brief: briefData,
          contentSoFar: fullContent,
          sectionToWrite: section,
          upcomingHeadings,
          language: outputLanguage,
          writerInstructions: isUploadedBrief ? writerInstructions : undefined,
          onStream: (chunk) => {
            fullContent += chunk;
            setGeneratedArticle({ title: initialTitle, content: fullContent });
          },
        });

        // If streaming worked, content is already added via onStream
        // If not (fallback), we need to add it
        if (!fullContent.includes(sectionContent)) {
          fullContent += sectionContent;
        }

        fullContent += '\n\n';
        setGeneratedArticle({ title: initialTitle, content: fullContent });
      }

      // Add FAQs if they exist
      if (briefData.faqs && briefData.faqs.questions.length > 0) {
        const totalSectionsWithFaqs = allSections.length + briefData.faqs.questions.length;
        setGenerationProgress({ currentSection: 'FAQs', currentIndex: allSections.length + 1, total: totalSectionsWithFaqs});
        const faqHeading = `## Frequently Asked Questions\n\n`;
        fullContent += faqHeading;
        setGeneratedArticle({ title: initialTitle, content: fullContent });

        for (let i = 0; i < briefData.faqs.questions.length; i++) {
            const faq = briefData.faqs.questions[i];
            setGenerationProgress({
                currentSection: `FAQ: ${faq.question}`,
                currentIndex: allSections.length + 1 + i,
                total: totalSectionsWithFaqs
            });

            // Add FAQ heading before streaming
            const faqHeadingText = `### ${faq.question}\n\n`;
            fullContent += faqHeadingText;
            setGeneratedArticle({ title: initialTitle, content: fullContent });

            const questionContent = await generateArticleSection({
                brief: briefData,
                contentSoFar: fullContent,
                sectionToWrite: {
                    heading: `Answer the question: ${faq.question}`,
                    guidelines: faq.guidelines,
                    level: 'H3',
                    reasoning: 'Answering a user FAQ',
                    children: [], targeted_keywords: [], competitor_coverage: []
                },
                upcomingHeadings: [],
                language: outputLanguage,
                writerInstructions: isUploadedBrief ? writerInstructions : undefined,
                onStream: (chunk) => {
                  fullContent += chunk;
                  setGeneratedArticle({ title: initialTitle, content: fullContent });
                },
            });

            // If streaming worked, content is already added via onStream
            if (!fullContent.includes(questionContent)) {
              fullContent += questionContent;
            }

            fullContent += '\n\n';
            setGeneratedArticle({ title: initialTitle, content: fullContent });
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during content generation.");
    } finally {
      setIsLoading(false);
      setGenerationProgress(null);
    }
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

  const handleRestart = () => {
    setCurrentView('initial_input');
    setBriefData({});
    setError(null);
    setSubjectInfo('');
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
    setContextFiles(new Map());
    setFileContents(new Map());
    setUrlContents(new Map());
    setApiLogin('');
    setApiPassword('');
    setGeneratedArticle(null);
    setGenerationProgress(null);
    setIsUploadedBrief(false);
    setWriterInstructions('');
    setIsFeelingLuckyFlow(false);
    setHasAchievedDataMaven(false); // Reset achievement
    setPaaQuestions([]); // Reset PAA questions
    setExtractedTemplate(null); // Reset template
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'initial_input':
        return <InitialInputScreen 
                  onStartAnalysis={handleStartAnalysis} 
                  isLoading={isLoading} 
                  error={error}
                  onStartUpload={() => setCurrentView('brief_upload')}
                />;
      case 'brief_upload':
        return <BriefUploadScreen
                  onFileUpload={handleBriefUpload}
                  isLoading={isLoading}
                  error={error}
                  onBack={handleRestart}
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
                 />;
      case 'visualization':
        return <CompetitionVizScreen 
                  competitorData={competitorData} 
                  topKeywords={topKeywordsForViz} 
                  onProceed={handleProceedToBriefing}
                  onToggleStar={handleToggleStar}
                  onFeelingLucky={handleFeelingLucky}
                />;
      case 'briefing':
        return <BriefingScreen
                  currentStep={briefingStep}
                  isLoading={isLoading}
                  error={error}
                  briefData={briefData}
                  setBriefData={setBriefData}
                  onNextStep={handleNextStep}
                  onRegenerate={handleRegenerateStep}
                  onRestart={handleRestart}
                  keywordVolumeMap={keywordVolumeMap}
                  competitorData={competitorData}
                  isFeelingLuckyFlow={isFeelingLuckyFlow}
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
                  isLoading={isLoading}
                  loadingStep={loadingStep}
                  competitorData={competitorData}
                  keywordVolumeMap={keywordVolumeMap}
                  onStartContentGeneration={handleStartContentGeneration}
                  isUploadedBrief={isUploadedBrief}
                  writerInstructions={writerInstructions}
                  setWriterInstructions={setWriterInstructions}
                  // Fun factor props
                  subjectInfo={subjectInfo}
                  brandInfo={brandInfo}
                  contextFiles={Array.from(contextFiles.values())}
                  outputLanguage={outputLanguage}
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
          />
      default:
        return <InitialInputScreen 
                  onStartAnalysis={handleStartAnalysis} 
                  isLoading={isLoading} 
                  error={error} 
                  onStartUpload={() => setCurrentView('brief_upload')}
               />;
    }
  };

  return (
    <SoundProvider>
        <div className="min-h-screen bg-black text-grey font-sans">
        <Header />
        <main className="container mx-auto p-4 md:p-6 lg:p-8">
            {/* Supabase mode header bar */}
            {isSupabaseMode && (
              <div className="flex items-center justify-between mb-4 -mt-2">
                <div className="flex items-center gap-3">
                  {onBackToBriefList && (
                    <button
                      onClick={onBackToBriefList}
                      className="flex items-center gap-1.5 text-sm text-grey hover:text-brand-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Briefs
                    </button>
                  )}
                  {clientName && (
                    <span className="text-grey/60 text-sm">
                      {clientName}
                    </span>
                  )}
                </div>
                <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
              </div>
            )}
            <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8">
                {renderCurrentView()}
            </div>
        </main>
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