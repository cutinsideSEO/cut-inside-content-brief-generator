// AppWrapper - Integrates Supabase auth and brief management with the existing App
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './services/supabaseClient';
import { createBrief, getBrief, updateBriefProgress, updateBriefStatus } from './services/briefService';
import { saveCompetitors, getCompetitorsForBrief, toCompetitorPages } from './services/competitorService';
import { createArticle, getArticleCountForClient } from './services/articleService';
import { useBriefLoader } from './hooks/useBriefLoader';
import { useAutoSave } from './hooks/useAutoSave';
import type { Brief, AppView as DatabaseAppView } from './types/database';
import type { SaveStatus } from './types/appState';

// Import screens
import LoginScreen from './components/screens/LoginScreen';
import ClientSelectScreen from './components/screens/ClientSelectScreen';
import BriefListScreen from './components/screens/BriefListScreen';
import ArticleViewScreen from './components/screens/ArticleViewScreen';
import PreWizardHeader from './components/PreWizardHeader';
import Sidebar from './components/Sidebar';

// Import the original App component
import OriginalApp from './App';

// Import TooltipProvider for Radix tooltips
import { TooltipProvider } from './components/ui/primitives/tooltip';
import { ToastProvider } from './contexts/ToastContext';

// Generation status type
type GenerationStatus = 'idle' | 'analyzing_competitors' | 'generating_brief' | 'generating_content';

// Type for tracking individual generation
interface GeneratingBrief {
  clientId: string;
  clientName: string;
  status: GenerationStatus;
  step: number | null;
}

// Types for the wrapper state
interface WrapperState {
  // Navigation mode
  mode: 'standalone' | 'client_select' | 'brief_list' | 'brief_editor';

  // Selected context
  selectedClientId: string | null;
  selectedClientName: string | null;
  currentBriefId: string | null;

  // Save status for auto-save
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;

  // Background generation tracking - now supports multiple parallel generations
  generatingBriefs: Record<string, GeneratingBrief>;

  // Article viewer
  selectedArticleId: string | null;
}

// Inner component that uses auth context
const AppWrapperInner: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, logout, isConfigured, userName } = useAuth();
  const { loadBrief, isLoading: briefLoading } = useBriefLoader();

  // Ref to hold saveNow function from the currently active App instance
  const saveNowRef = useRef<(() => Promise<void>) | null>(null);

  const [state, setState] = useState<WrapperState>({
    mode: 'standalone',
    selectedClientId: null,
    selectedClientName: null,
    currentBriefId: null,
    saveStatus: 'saved',
    lastSavedAt: null,
    generatingBriefs: {},
    selectedArticleId: null,
  });

  // Brief data for auto-save (will be populated when loading a brief)
  const [briefDataForSave, setBriefDataForSave] = useState<any>(null);

  // Article count for sidebar
  const [articleCount, setArticleCount] = useState(0);

  // Fetch article count when in brief_list mode
  useEffect(() => {
    if (state.mode === 'brief_list' && state.selectedClientId) {
      getArticleCountForClient(state.selectedClientId).then(setArticleCount);
    }
  }, [state.mode, state.selectedClientId]);

  // Determine initial mode based on auth and config
  useEffect(() => {
    if (!authLoading) {
      if (isConfigured) {
        // Supabase configured - show client_select (which will show login if not authenticated)
        setState((prev) => ({ ...prev, mode: 'client_select' }));
      } else {
        // No Supabase - run in standalone mode
        setState((prev) => ({ ...prev, mode: 'standalone' }));
      }
    }
  }, [authLoading, isAuthenticated, isConfigured]);

  // Handle login success
  const handleLoginSuccess = useCallback(() => {
    if (isConfigured) {
      setState((prev) => ({ ...prev, mode: 'client_select' }));
    } else {
      setState((prev) => ({ ...prev, mode: 'standalone' }));
    }
  }, [isConfigured]);

  // Handle logout
  const handleLogout = useCallback(() => {
    logout();
    setState({
      mode: 'standalone',
      selectedClientId: null,
      selectedClientName: null,
      currentBriefId: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      generatingBriefs: {},
      selectedArticleId: null,
    });
  }, [logout]);

  // Handle generation start (from App) - now supports multiple parallel generations
  const handleGenerationStart = useCallback((
    type: 'competitors' | 'brief' | 'content',
    briefId: string,
    clientId?: string,
    clientName?: string
  ) => {
    const statusMap: Record<typeof type, GenerationStatus> = {
      'competitors': 'analyzing_competitors',
      'brief': 'generating_brief',
      'content': 'generating_content',
    };
    setState((prev) => ({
      ...prev,
      generatingBriefs: {
        ...prev.generatingBriefs,
        [briefId]: {
          clientId: clientId || prev.selectedClientId || '',
          clientName: clientName || prev.selectedClientName || '',
          status: statusMap[type],
          step: type === 'brief' ? 1 : null,
        },
      },
    }));
    // Update brief status in Supabase
    updateBriefStatus(briefId, 'in_progress');
  }, []);

  // Handle generation progress (step updates) - now takes briefId
  const handleGenerationProgress = useCallback((briefId: string, step: number) => {
    setState((prev) => {
      const brief = prev.generatingBriefs[briefId];
      if (!brief) return prev;
      return {
        ...prev,
        generatingBriefs: {
          ...prev.generatingBriefs,
          [briefId]: {
            ...brief,
            step,
          },
        },
      };
    });
  }, []);

  // Handle generation complete - removes from the map
  const handleGenerationComplete = useCallback((briefId: string, success: boolean) => {
    setState((prev) => {
      const { [briefId]: removed, ...remaining } = prev.generatingBriefs;
      return {
        ...prev,
        generatingBriefs: remaining,
      };
    });
    // Update brief status in Supabase
    if (success) {
      updateBriefStatus(briefId, 'complete');
    }
  }, []);

  // Handle client selection
  const handleSelectClient = useCallback((clientId: string, clientName: string) => {
    setState((prev) => ({
      ...prev,
      mode: 'brief_list',
      selectedClientId: clientId,
      selectedClientName: clientName,
    }));
  }, []);

  // Handle back to client selection
  const handleBackToClients = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: 'client_select',
      // Client info is now stored in each generating brief, so we can clear it
      selectedClientId: null,
      selectedClientName: null,
      currentBriefId: null,
      selectedArticleId: null,
    }));
  }, []);

  // Handle creating a new brief
  const handleCreateBrief = useCallback(async () => {
    if (!state.selectedClientId) return;

    // Generate a default name
    const defaultName = `New Brief - ${new Date().toLocaleDateString()}`;

    // Create the brief in Supabase
    const { data, error } = await createBrief(state.selectedClientId, defaultName);

    if (error || !data) {
      console.error('Failed to create brief:', error);
      alert('Failed to create brief. Please try again.');
      return;
    }

    // Navigate to the brief editor with the new brief ID
    setState((prev) => ({
      ...prev,
      mode: 'brief_editor',
      currentBriefId: data.id,
    }));
  }, [state.selectedClientId]);

  // Handle continuing an existing brief
  const handleContinueBrief = useCallback(async (briefId: string) => {
    setState((prev) => ({
      ...prev,
      mode: 'brief_editor',
      currentBriefId: briefId,
      selectedArticleId: null,
    }));
  }, []);

  // Handle editing a complete brief
  const handleEditBrief = useCallback((briefId: string) => {
    setState((prev) => ({
      ...prev,
      mode: 'brief_editor',
      currentBriefId: briefId,
      selectedArticleId: null,
    }));
  }, []);

  // Handle using a brief as template
  const handleUseAsTemplate = useCallback(async (briefId: string) => {
    // For now, just show an alert - this can be expanded later
    alert('Template feature coming soon! For now, you can manually copy the brief structure.');
  }, []);

  // Handle viewing an article
  const handleViewArticle = useCallback((articleId: string) => {
    setState(prev => ({
      ...prev,
      selectedArticleId: articleId,
    }));
  }, []);

  // Handle back from article view
  const handleBackFromArticle = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedArticleId: null,
    }));
  }, []);

  // Handle save status changes from the brief editor
  const handleSaveStatusChange = useCallback((status: SaveStatus, savedAt?: Date) => {
    setState((prev) => ({
      ...prev,
      saveStatus: status,
      lastSavedAt: savedAt || prev.lastSavedAt,
    }));
  }, []);

  // Handle brief completion
  const handleBriefComplete = useCallback(async () => {
    if (state.currentBriefId) {
      await updateBriefStatus(state.currentBriefId, 'complete');
    }
  }, [state.currentBriefId]);

  // Render loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal"></div>
      </div>
    );
  }

  // Render based on mode
  switch (state.mode) {
    case 'client_select':
      if (!isAuthenticated) {
        return (
          <div className="min-h-screen bg-background text-gray-600 font-sans flex">
            {/* Brand Panel — Left Half (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 to-teal-800 items-center justify-center relative overflow-hidden">
              <div className="relative z-10 text-center px-12">
                <img src="https://cutinside.com/wp-content/uploads/2025/01/Logo.svg" alt="Cut Inside" className="h-12 w-auto mx-auto mb-6 brightness-0 invert" />
                <h1 className="text-3xl font-heading font-bold text-white mb-3">Content Brief Generator</h1>
                <p className="text-teal-100 text-lg max-w-md mx-auto">AI-powered SEO content strategy for data-driven briefs</p>
              </div>
            </div>
            {/* Login Form — Right Half */}
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-md">
                <LoginScreen onLoginSuccess={handleLoginSuccess} />
              </div>
            </div>
          </div>
        );
      }
      const generatingBriefIds = Object.keys(state.generatingBriefs);
      const hasGeneratingBriefs = generatingBriefIds.length > 0;
      return (
        <>
          <div className="min-h-screen bg-background text-gray-600 font-sans flex flex-col">
            <PreWizardHeader onLogout={handleLogout} userName={userName} />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <ClientSelectScreen
                  onSelectClient={handleSelectClient}
                  generatingBriefs={state.generatingBriefs}
                  onViewGeneratingBrief={(briefId) => {
                    const brief = state.generatingBriefs[briefId];
                    if (brief) {
                      setState((prev) => ({
                        ...prev,
                        mode: 'brief_editor',
                        currentBriefId: briefId,
                        selectedClientId: brief.clientId,
                        selectedClientName: brief.clientName,
                      }));
                    }
                  }}
                />
              </div>
            </main>
          </div>
          {/* Keep App components mounted but hidden during background generation */}
          {hasGeneratingBriefs && (
            <div className="hidden">
              {generatingBriefIds.map((briefId) => {
                const brief = state.generatingBriefs[briefId];
                return (
                  <OriginalApp
                    key={briefId}
                    briefId={briefId}
                    clientId={brief.clientId}
                    clientName={brief.clientName}
                    onBackToBriefList={() => {}}
                    onSaveStatusChange={handleSaveStatusChange}
                    saveStatus={state.saveStatus}
                    lastSavedAt={state.lastSavedAt}
                    isSupabaseMode={true}
                    onGenerationStart={(type, id) => handleGenerationStart(type, id, brief.clientId, brief.clientName)}
                    onGenerationProgress={(step) => handleGenerationProgress(briefId, step)}
                    onGenerationComplete={handleGenerationComplete}
                    isBackgroundMode={true}
                  />
                );
              })}
            </div>
          )}
        </>
      );

    case 'brief_list':
      // Get all generating briefs (could be multiple in parallel)
      const generatingBriefIdsInList = Object.keys(state.generatingBriefs);
      const hasGeneratingBriefsInList = generatingBriefIdsInList.length > 0;
      return (
        <>
          <div className="min-h-screen bg-background text-gray-600 font-sans flex flex-col">
            <PreWizardHeader
              clientName={state.selectedClientName}
              onClientClick={handleBackToClients}
              onLogout={handleLogout}
              userName={userName}
            />
            <div className="flex-1 flex overflow-hidden">
              <Sidebar
                currentView="brief_list"
                clientName={state.selectedClientName || undefined}
                onBackToClients={handleBackToClients}
                briefCounts={{ draft: 0, in_progress: 0, complete: 0 }}
                articleCount={articleCount}
              />
              <main className="flex-1 overflow-y-auto">
                <div className="px-6 lg:px-8 py-8">
                  {state.selectedArticleId ? (
                    <ArticleViewScreen
                      articleId={state.selectedArticleId}
                      onBack={handleBackFromArticle}
                    />
                  ) : (
                    <BriefListScreen
                      clientId={state.selectedClientId!}
                      clientName={state.selectedClientName!}
                      onBack={handleBackToClients}
                      onCreateBrief={handleCreateBrief}
                      onContinueBrief={handleContinueBrief}
                      onEditBrief={handleEditBrief}
                      onUseAsTemplate={handleUseAsTemplate}
                      generatingBriefs={state.generatingBriefs}
                      onViewArticle={handleViewArticle}
                    />
                  )}
                </div>
              </main>
            </div>
          </div>
          {/* Keep App components mounted but hidden during background generation */}
          {hasGeneratingBriefsInList && (
            <div className="hidden">
              {generatingBriefIdsInList.map((briefId) => {
                const brief = state.generatingBriefs[briefId];
                return (
                  <OriginalApp
                    key={briefId}
                    briefId={briefId}
                    clientId={brief.clientId}
                    clientName={brief.clientName}
                    onBackToBriefList={() => {}} // No-op since we're in background
                    onSaveStatusChange={handleSaveStatusChange}
                    saveStatus={state.saveStatus}
                    lastSavedAt={state.lastSavedAt}
                    isSupabaseMode={true}
                    onGenerationStart={(type, id) => handleGenerationStart(type, id, brief.clientId, brief.clientName)}
                    onGenerationProgress={(step) => handleGenerationProgress(briefId, step)}
                    onGenerationComplete={handleGenerationComplete}
                    isBackgroundMode={true}
                  />
                );
              })}
            </div>
          )}
        </>
      );

    case 'brief_editor':
      // Check if this brief is currently generating
      const currentBriefGenerating = state.currentBriefId ? state.generatingBriefs[state.currentBriefId] : null;

      // Handler for back to brief list that saves first
      const handleBackToBriefListWithSave = async () => {
        // Flush any pending saves before navigating
        if (saveNowRef.current) {
          try {
            await saveNowRef.current();
          } catch (err) {
            console.error('Failed to save before navigation:', err);
            // Continue with navigation even if save fails
          }
        }
        setState((prev) => ({
          ...prev,
          mode: 'brief_list',
          currentBriefId: null,
          selectedArticleId: null,
        }));
      };

      // Pass the brief ID and save handlers to the original App
      return (
        <OriginalApp
          briefId={state.currentBriefId}
          clientId={state.selectedClientId}
          clientName={state.selectedClientName}
          onBackToBriefList={handleBackToBriefListWithSave}
          onSaveStatusChange={handleSaveStatusChange}
          saveStatus={state.saveStatus}
          lastSavedAt={state.lastSavedAt}
          isSupabaseMode={true}
          onGenerationStart={(type, briefId) => handleGenerationStart(type, briefId, state.selectedClientId || undefined, state.selectedClientName || undefined)}
          onGenerationProgress={(step) => state.currentBriefId && handleGenerationProgress(state.currentBriefId, step)}
          onGenerationComplete={handleGenerationComplete}
          isBackgroundMode={false}
          onSaveNowRef={saveNowRef}
        />
      );

    case 'standalone':
    default:
      // Run the original app without Supabase integration
      return <OriginalApp isSupabaseMode={false} />;
  }
};

// Main wrapper component with providers
const AppWrapper: React.FC = () => {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={300}>
        <ToastProvider>
          <AppWrapperInner />
        </ToastProvider>
      </TooltipProvider>
    </AuthProvider>
  );
};

export default AppWrapper;
