// AppWrapper - Integrates Supabase auth and brief management with the existing App
import React, { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './services/supabaseClient';
import { createBrief, getBrief, updateBriefProgress, updateBriefStatus } from './services/briefService';
import { saveCompetitors, getCompetitorsForBrief, toCompetitorPages } from './services/competitorService';
import { createArticle } from './services/articleService';
import { useBriefLoader } from './hooks/useBriefLoader';
import { useAutoSave } from './hooks/useAutoSave';
import type { Brief, AppView as DatabaseAppView } from './types/database';
import type { SaveStatus } from './types/appState';

// Import screens
import LoginScreen from './components/screens/LoginScreen';
import ClientSelectScreen from './components/screens/ClientSelectScreen';
import BriefListScreen from './components/screens/BriefListScreen';

// Import the original App component
import OriginalApp from './App';

// Generation status type
type GenerationStatus = 'idle' | 'analyzing_competitors' | 'generating_brief' | 'generating_content';

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

  // Background generation tracking
  generatingBriefId: string | null;
  generationStatus: GenerationStatus;
  generationStep: number | null;
}

// Inner component that uses auth context
const AppWrapperInner: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, logout, isConfigured } = useAuth();
  const { loadBrief, isLoading: briefLoading } = useBriefLoader();

  const [state, setState] = useState<WrapperState>({
    mode: 'standalone',
    selectedClientId: null,
    selectedClientName: null,
    currentBriefId: null,
    saveStatus: 'saved',
    lastSavedAt: null,
    generatingBriefId: null,
    generationStatus: 'idle',
    generationStep: null,
  });

  // Brief data for auto-save (will be populated when loading a brief)
  const [briefDataForSave, setBriefDataForSave] = useState<any>(null);

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
      generatingBriefId: null,
      generationStatus: 'idle',
      generationStep: null,
    });
  }, [logout]);

  // Handle generation start (from App)
  const handleGenerationStart = useCallback((type: 'competitors' | 'brief' | 'content', briefId: string) => {
    const statusMap: Record<typeof type, GenerationStatus> = {
      'competitors': 'analyzing_competitors',
      'brief': 'generating_brief',
      'content': 'generating_content',
    };
    setState((prev) => ({
      ...prev,
      generatingBriefId: briefId,
      generationStatus: statusMap[type],
      generationStep: type === 'brief' ? 1 : null,
    }));
    // Update brief status in Supabase
    updateBriefStatus(briefId, 'in_progress');
  }, []);

  // Handle generation progress (step updates)
  const handleGenerationProgress = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      generationStep: step,
    }));
  }, []);

  // Handle generation complete
  const handleGenerationComplete = useCallback((briefId: string, success: boolean) => {
    setState((prev) => ({
      ...prev,
      generatingBriefId: null,
      generationStatus: 'idle',
      generationStep: null,
    }));
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
      // Keep client info if generation is in progress (needed for background App)
      selectedClientId: prev.generationStatus !== 'idle' ? prev.selectedClientId : null,
      selectedClientName: prev.generationStatus !== 'idle' ? prev.selectedClientName : null,
      currentBriefId: null,
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
    }));
  }, []);

  // Handle editing a complete brief
  const handleEditBrief = useCallback((briefId: string) => {
    setState((prev) => ({
      ...prev,
      mode: 'brief_editor',
      currentBriefId: briefId,
    }));
  }, []);

  // Handle using a brief as template
  const handleUseAsTemplate = useCallback(async (briefId: string) => {
    // For now, just show an alert - this can be expanded later
    alert('Template feature coming soon! For now, you can manually copy the brief structure.');
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal"></div>
      </div>
    );
  }

  // Render based on mode
  switch (state.mode) {
    case 'client_select':
      if (!isAuthenticated) {
        return (
          <div className="min-h-screen bg-black text-grey font-sans">
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
              <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8">
                <LoginScreen onLoginSuccess={handleLoginSuccess} />
              </div>
            </div>
          </div>
        );
      }
      const isGeneratingOnClientSelect = state.generationStatus !== 'idle' && state.generatingBriefId;
      return (
        <>
          <div className="min-h-screen bg-black text-grey font-sans">
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
              <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8">
                <ClientSelectScreen
                  onSelectClient={handleSelectClient}
                  onLogout={handleLogout}
                  generatingBriefId={state.generatingBriefId}
                  generationStatus={state.generationStatus}
                  generatingClientId={state.selectedClientId}
                  onViewGeneratingBrief={() => {
                    if (state.generatingBriefId && state.selectedClientId) {
                      setState((prev) => ({
                        ...prev,
                        mode: 'brief_editor',
                        currentBriefId: prev.generatingBriefId,
                      }));
                    }
                  }}
                />
              </div>
            </div>
          </div>
          {/* Keep App mounted but hidden during background generation */}
          {isGeneratingOnClientSelect && (
            <div className="hidden">
              <OriginalApp
                briefId={state.generatingBriefId}
                clientId={state.selectedClientId}
                clientName={state.selectedClientName}
                onBackToBriefList={() => {}}
                onSaveStatusChange={handleSaveStatusChange}
                saveStatus={state.saveStatus}
                lastSavedAt={state.lastSavedAt}
                isSupabaseMode={true}
                onGenerationStart={handleGenerationStart}
                onGenerationProgress={handleGenerationProgress}
                onGenerationComplete={handleGenerationComplete}
                isBackgroundMode={true}
              />
            </div>
          )}
        </>
      );

    case 'brief_list':
      // If there's background generation, keep App mounted but hidden
      const isGenerating = state.generationStatus !== 'idle' && state.generatingBriefId;
      return (
        <>
          <div className="min-h-screen bg-black text-grey font-sans">
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
              <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8">
                <BriefListScreen
                  clientId={state.selectedClientId!}
                  clientName={state.selectedClientName!}
                  onBack={handleBackToClients}
                  onCreateBrief={handleCreateBrief}
                  onContinueBrief={handleContinueBrief}
                  onEditBrief={handleEditBrief}
                  onUseAsTemplate={handleUseAsTemplate}
                  generatingBriefId={state.generatingBriefId}
                  generationStatus={state.generationStatus}
                  generationStep={state.generationStep}
                />
              </div>
            </div>
          </div>
          {/* Keep App mounted but hidden during background generation */}
          {isGenerating && (
            <div className="hidden">
              <OriginalApp
                briefId={state.generatingBriefId}
                clientId={state.selectedClientId}
                clientName={state.selectedClientName}
                onBackToBriefList={() => {}} // No-op since we're in background
                onSaveStatusChange={handleSaveStatusChange}
                saveStatus={state.saveStatus}
                lastSavedAt={state.lastSavedAt}
                isSupabaseMode={true}
                onGenerationStart={handleGenerationStart}
                onGenerationProgress={handleGenerationProgress}
                onGenerationComplete={handleGenerationComplete}
                isBackgroundMode={true}
              />
            </div>
          )}
        </>
      );

    case 'brief_editor':
      // Pass the brief ID and save handlers to the original App
      return (
        <OriginalApp
          briefId={state.currentBriefId}
          clientId={state.selectedClientId}
          clientName={state.selectedClientName}
          onBackToBriefList={() => setState((prev) => ({
            ...prev,
            mode: 'brief_list',
            currentBriefId: null,
            // Keep generatingBriefId if generation is in progress
            generatingBriefId: prev.generationStatus !== 'idle' ? prev.currentBriefId : null,
          }))}
          onSaveStatusChange={handleSaveStatusChange}
          saveStatus={state.saveStatus}
          lastSavedAt={state.lastSavedAt}
          isSupabaseMode={true}
          onGenerationStart={handleGenerationStart}
          onGenerationProgress={handleGenerationProgress}
          onGenerationComplete={handleGenerationComplete}
          isBackgroundMode={false}
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
      <AppWrapperInner />
    </AuthProvider>
  );
};

export default AppWrapper;
