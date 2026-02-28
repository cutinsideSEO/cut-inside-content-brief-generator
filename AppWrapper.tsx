// AppWrapper - Integrates Supabase auth and brief management with the existing App
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured, supabase } from './services/supabaseClient';
import { createBrief, getBrief, updateBriefStatus } from './services/briefService';
import { isWorkflowStatus } from './types/database';
import { getAccessibleClients, getClientWithContext } from './services/clientService';
import { createGenerationJob } from './services/generationJobService';
import { getClientLogoUrl } from './lib/favicon';
import { toast } from 'sonner';
import { useBriefLoader } from './hooks/useBriefLoader';
import type { Brief, AppView as DatabaseAppView, GenerationJob, GenerationJobProgress } from './types/database';
import type { SaveStatus } from './types/appState';

// Import screens
import LoginScreen from './components/screens/LoginScreen';
import ClientSelectScreen from './components/screens/ClientSelectScreen';
import BriefListScreen from './components/screens/BriefListScreen';
import ArticleScreen from './components/screens/ArticleScreen';
import ClientProfileScreen from './components/screens/ClientProfileScreen';
import PreWizardHeader from './components/PreWizardHeader';
import Sidebar from './components/Sidebar';

// Import the original App component
import OriginalApp from './App';

// Import TooltipProvider for Radix tooltips
import { TooltipProvider } from './components/ui/primitives/tooltip';
import { ToastProvider } from './contexts/ToastContext';
import { Tooltip, TooltipTrigger, TooltipContent } from './components/ui/primitives/tooltip';

// Generation status type
type GenerationStatus = 'idle' | 'analyzing_competitors' | 'generating_brief' | 'generating_content';

// Type for tracking individual generation
interface GeneratingBrief {
  clientId: string;
  clientName: string;
  status: GenerationStatus;
  step: number | null;
  saveStatus?: SaveStatus;
  // Backend job tracking
  jobId?: string;
  jobProgress?: GenerationJobProgress;
  isBackend?: boolean;
}

// Types for the wrapper state
interface WrapperState {
  // Navigation mode
  mode: 'standalone' | 'client_select' | 'brief_list' | 'brief_editor' | 'client_profile';

  // Selected context
  selectedClientId: string | null;
  selectedClientName: string | null;
  selectedClientLogoUrl: string | null;
  selectedClientBrandColor: string | null;
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
    selectedClientLogoUrl: null,
    selectedClientBrandColor: null,
    currentBriefId: null,
    saveStatus: 'saved',
    lastSavedAt: null,
    generatingBriefs: {},
    selectedArticleId: null,
  });

  // Article count for sidebar
  const [articleCount, setArticleCount] = useState(0);

  // Brief counts for sidebar
  const [briefCounts, setBriefCounts] = useState<{ draft: number; in_progress: number; complete: number; workflow?: number; published?: number }>({ draft: 0, in_progress: 0, complete: 0 });

  // All clients for client switcher dropdown
  const [allClients, setAllClients] = useState<import('./types/database').ClientWithBriefCount[]>([]);

  // Fetch all clients when authenticated and in brief_list or client_profile mode
  useEffect(() => {
    if (isAuthenticated && (state.mode === 'brief_list' || state.mode === 'client_profile')) {
      getAccessibleClients().then(({ data }) => {
        if (data) setAllClients(data);
      });
    }
  }, [isAuthenticated, state.mode]);

  // Callback for BriefListScreen to sync counts with sidebar
  const handleCountsChange = useCallback((counts: { draft: number; in_progress: number; complete: number; workflow: number; published: number; articles: number }) => {
    setBriefCounts({ draft: counts.draft, in_progress: counts.in_progress, complete: counts.complete, workflow: counts.workflow, published: counts.published });
    setArticleCount(counts.articles);
  }, []);

  // Subscribe to generation_jobs changes for all briefs belonging to the current client
  // This replaces the hidden <App> instances for background generation tracking
  useEffect(() => {
    if (!isAuthenticated || !state.selectedClientId) return;

    const channel = supabase
      .channel(`gen-jobs-client:${state.selectedClientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'generation_jobs',
        filter: `client_id=eq.${state.selectedClientId}`,
      }, (payload) => {
        const job = payload.new as GenerationJob;
        if (!job || !job.brief_id) return;
        const progress = (job.progress || {}) as GenerationJobProgress;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setState(prev => {
            if (job.status === 'pending' || job.status === 'running') {
              // Track this generating brief
              const statusMap: Record<string, GenerationStatus> = {
                'full_brief': 'generating_brief',
                'brief_step': 'generating_brief',
                'regenerate': 'generating_brief',
                'article': 'generating_content',
                'competitors': 'analyzing_competitors',
              };
              return {
                ...prev,
                generatingBriefs: {
                  ...prev.generatingBriefs,
                  [job.brief_id]: {
                    clientId: job.client_id,
                    clientName: prev.selectedClientName || '',
                    status: statusMap[job.job_type] || 'generating_brief',
                    step: progress.current_step || null,
                    isBackend: true,
                    jobId: job.id,
                    jobProgress: progress,
                  },
                },
              };
            } else if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
              // Remove from generating briefs after a short delay
              const { [job.brief_id]: _removed, ...remaining } = prev.generatingBriefs;
              // Mark as idle briefly, then remove
              return {
                ...prev,
                generatingBriefs: {
                  ...remaining,
                  [job.brief_id]: {
                    ...prev.generatingBriefs[job.brief_id],
                    clientId: job.client_id,
                    clientName: prev.selectedClientName || '',
                    status: 'idle',
                    step: null,
                    isBackend: true,
                    jobId: job.id,
                  },
                },
              };
            }
            return prev;
          });

          // Clean up completed jobs from the map after delay
          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
            setTimeout(() => {
              setState(prev => {
                const { [job.brief_id]: removed, ...remaining } = prev.generatingBriefs;
                return { ...prev, generatingBriefs: remaining };
              });
            }, 3000);
          }
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isAuthenticated, state.selectedClientId, state.selectedClientName]);

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
      selectedClientLogoUrl: null,
      selectedClientBrandColor: null,
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
    // Update brief status in Supabase — but only if not already in a workflow status
    getBrief(briefId).then(({ data }) => {
      if (data && !isWorkflowStatus(data.status)) {
        updateBriefStatus(briefId, 'in_progress');
      }
    });
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

  // Handle generation complete - delays removal to allow final save to complete
  const handleGenerationComplete = useCallback((briefId: string, success: boolean) => {
    // Update brief status in Supabase — but only if not already in a workflow status
    if (success) {
      getBrief(briefId).then(({ data }) => {
        if (data && !isWorkflowStatus(data.status)) {
          updateBriefStatus(briefId, 'complete');
        }
      });
    }
    // Mark generation as complete but keep mounted for 3 seconds to let final save flush
    setState((prev) => {
      const brief = prev.generatingBriefs[briefId];
      if (!brief) return prev;
      return {
        ...prev,
        generatingBriefs: {
          ...prev.generatingBriefs,
          [briefId]: { ...brief, status: 'idle' },
        },
      };
    });
    // Remove from map after delay to prevent premature unmount during save
    setTimeout(() => {
      setState((prev) => {
        const { [briefId]: removed, ...remaining } = prev.generatingBriefs;
        return {
          ...prev,
          generatingBriefs: remaining,
        };
      });
    }, 3000);
  }, []);

  // Memoized wrappers for generation callbacks — inline arrow functions in JSX
  // create new references every render, causing infinite re-render loops when
  // effects in App.tsx depend on them and call them (triggering state updates).
  const wrappedOnGenerationStart = useCallback((type: 'competitors' | 'brief' | 'content', briefId: string) => {
    handleGenerationStart(type, briefId, state.selectedClientId || undefined, state.selectedClientName || undefined);
  }, [state.selectedClientId, state.selectedClientName, handleGenerationStart]);

  const wrappedOnGenerationProgress = useCallback((step: number) => {
    if (state.currentBriefId) handleGenerationProgress(state.currentBriefId, step);
  }, [state.currentBriefId, handleGenerationProgress]);

  // Handle client selection
  const handleSelectClient = useCallback((clientId: string, clientName: string, logoUrl?: string, brandColor?: string) => {
    setState((prev) => ({
      ...prev,
      mode: 'brief_list',
      selectedClientId: clientId,
      selectedClientName: clientName,
      selectedClientLogoUrl: logoUrl || null,
      selectedClientBrandColor: brandColor || null,
    }));
  }, []);

  // Handle switching client from dropdown (stays in brief_list mode)
  const handleSwitchClient = useCallback((clientId: string, clientName: string, logoUrl?: string, brandColor?: string) => {
    setState((prev) => ({
      ...prev,
      mode: 'brief_list',
      selectedClientId: clientId,
      selectedClientName: clientName,
      selectedClientLogoUrl: logoUrl || null,
      selectedClientBrandColor: brandColor || null,
      currentBriefId: null,
      selectedArticleId: null,
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
      selectedClientLogoUrl: null,
      selectedClientBrandColor: null,
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
      toast.error('Failed to create brief. Please try again.');
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

  // Handle using a brief as template (feature not yet implemented)
  const handleUseAsTemplate = useCallback(async (_briefId: string) => {
    toast.info('Template feature coming soon!');
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

  // Handle opening client profile
  const handleOpenClientProfile = useCallback((clientId: string, clientName: string) => {
    setState(prev => ({
      ...prev,
      mode: 'client_profile',
      selectedClientId: clientId,
      selectedClientName: clientName,
    }));
  }, []);

  // Handle back from client profile — re-fetch client data to pick up website/logo changes
  const handleBackFromProfile = useCallback(async () => {
    const clientId = state.selectedClientId;
    if (clientId) {
      const { data } = await getClientWithContext(clientId);
      if (data) {
        const logoUrl = getClientLogoUrl(data.brand_identity) || null;
        const brandColor = data.brand_identity?.brand_color || null;
        setState(prev => ({
          ...prev,
          mode: 'brief_list',
          selectedClientName: data.name,
          selectedClientLogoUrl: logoUrl,
          selectedClientBrandColor: brandColor,
        }));
        return;
      }
    }
    setState(prev => ({
      ...prev,
      mode: prev.selectedClientId ? 'brief_list' : 'client_select',
    }));
  }, [state.selectedClientId]);

  // Handle save status changes from the brief editor (foreground)
  const handleSaveStatusChange = useCallback((status: SaveStatus, savedAt?: Date) => {
    setState((prev) => ({
      ...prev,
      saveStatus: status,
      lastSavedAt: savedAt || prev.lastSavedAt,
    }));
  }, []);

  // Note: Background generation save status is now tracked via Realtime
  // subscriptions to generation_jobs table — no per-brief save status callback needed.

  // Handle brief completion — preserve workflow statuses
  const handleBriefComplete = useCallback(async () => {
    if (state.currentBriefId) {
      const { data } = await getBrief(state.currentBriefId);
      if (data && !isWorkflowStatus(data.status)) {
        await updateBriefStatus(state.currentBriefId, 'complete');
      }
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
      return (
        <div className="min-h-screen bg-background text-gray-600 font-sans flex flex-col">
          <PreWizardHeader onLogout={handleLogout} userName={userName} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <ClientSelectScreen
                onSelectClient={handleSelectClient}
                onOpenClientProfile={handleOpenClientProfile}
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
      );

    case 'brief_list':
      return (
        <div className="min-h-screen bg-background text-gray-600 font-sans flex flex-col">
          <PreWizardHeader
            clientName={state.selectedClientName}
            clientLogoUrl={state.selectedClientLogoUrl}
            onClientClick={handleBackToClients}
            onLogout={handleLogout}
            userName={userName}
            clients={allClients}
            onSwitchClient={handleSwitchClient}
            selectedClientId={state.selectedClientId}
          />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar
              currentView="brief_list"
              clientName={state.selectedClientName || undefined}
              clientLogoUrl={state.selectedClientLogoUrl}
              clientBrandColor={state.selectedClientBrandColor}
              onBackToClients={handleBackToClients}
              briefCounts={briefCounts}
              articleCount={articleCount}
              onOpenClientSettings={() => {
                if (state.selectedClientId && state.selectedClientName) {
                  handleOpenClientProfile(state.selectedClientId, state.selectedClientName);
                }
              }}
              clients={allClients}
              onSwitchClient={handleSwitchClient}
              selectedClientId={state.selectedClientId}
            />
            <main className="flex-1 overflow-y-auto">
              <div className="px-6 lg:px-8 py-8">
                {state.selectedArticleId ? (
                  <ArticleScreen
                    articleId={state.selectedArticleId}
                    onBack={handleBackFromArticle}
                  />
                ) : (
                  <BriefListScreen
                    clientId={state.selectedClientId!}
                    clientName={state.selectedClientName!}
                    clientLogoUrl={state.selectedClientLogoUrl}
                    clientBrandColor={state.selectedClientBrandColor}
                    onBack={handleBackToClients}
                    onCreateBrief={handleCreateBrief}
                    onContinueBrief={handleContinueBrief}
                    onEditBrief={handleEditBrief}
                    onUseAsTemplate={handleUseAsTemplate}
                    generatingBriefs={state.generatingBriefs}
                    onViewArticle={handleViewArticle}
                    onCountsChange={handleCountsChange}
                  />
                )}
              </div>
            </main>
          </div>
        </div>
      );

    case 'client_profile':
      return (
        <div className="min-h-screen bg-background text-gray-600 font-sans flex flex-col">
          <PreWizardHeader
            clientName={state.selectedClientName}
            clientLogoUrl={state.selectedClientLogoUrl}
            onClientClick={handleBackToClients}
            onLogout={handleLogout}
            userName={userName}
            clients={allClients}
            onSwitchClient={handleSwitchClient}
            selectedClientId={state.selectedClientId}
          />
          <div className="flex-1 flex overflow-hidden">
            <ClientProfileScreen
              clientId={state.selectedClientId!}
              onBack={handleBackFromProfile}
            />
          </div>
        </div>
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
            toast.warning('Changes may not have been saved. Please check your work.');
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
          onGenerationStart={wrappedOnGenerationStart}
          onGenerationProgress={wrappedOnGenerationProgress}
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
