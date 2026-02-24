import React from 'react';
import { FlagIcon, KeyIcon, FileSearchIcon, PuzzleIcon, ListTreeIcon, HelpCircleIcon, FileCodeIcon, CheckIcon, HomeIcon, AlertTriangleIcon } from './Icon';
import { ClientSwitcherDropdown } from './PreWizardHeader';
import type { ContentBrief } from '../types';
import type { ClientWithBriefCount } from '../types/database';

type AppView = 'initial_input' | 'context_input' | 'visualization' | 'briefing' | 'dashboard' | 'content_generation' | 'brief_upload' | 'brief_list';

const BRIEFING_STEPS = [
  { uiStep: 1, title: 'Goal & Audience', icon: <FlagIcon className="h-4 w-4" /> },
  { uiStep: 2, title: 'Comp. Analysis', icon: <FileSearchIcon className="h-4 w-4" /> },
  { uiStep: 3, title: 'Keywords', icon: <KeyIcon className="h-4 w-4" /> },
  { uiStep: 4, title: 'Content Gaps', icon: <PuzzleIcon className="h-4 w-4" /> },
  { uiStep: 5, title: 'Structure', icon: <ListTreeIcon className="h-4 w-4" /> },
  { uiStep: 6, title: 'FAQs', icon: <HelpCircleIcon className="h-4 w-4" /> },
  { uiStep: 7, title: 'On-Page SEO', icon: <FileCodeIcon className="h-4 w-4" /> },
];

const DASHBOARD_SECTIONS = [
  { logicalStep: 1, title: 'Goal & Audience', icon: <FlagIcon className="h-5 w-5" /> },
  { logicalStep: 3, title: 'Competitive Analysis', icon: <FileSearchIcon className="h-5 w-5" /> },
  { logicalStep: 2, title: 'Keyword Strategy', icon: <KeyIcon className="h-5 w-5" /> },
  { logicalStep: 4, title: 'Content Gaps', icon: <PuzzleIcon className="h-5 w-5" /> },
  { logicalStep: 5, title: 'Structure', icon: <ListTreeIcon className="h-5 w-5" /> },
  { logicalStep: 6, title: 'FAQs', icon: <HelpCircleIcon className="h-5 w-5" /> },
  { logicalStep: 7, title: 'On-Page SEO', icon: <FileCodeIcon className="h-5 w-5" /> },
];

interface SidebarProps {
  currentView: AppView;
  briefingStep?: number;
  selectedSection?: number | null;
  onSelectSection?: (section: number | null) => void;
  onGoToStep?: (step: number) => void;
  staleSteps?: Set<number>;
  isUploadedBrief?: boolean;
  clientName?: string;
  clientLogoUrl?: string | null;
  clientBrandColor?: string | null;
  onBackToClients?: () => void;
  briefCounts?: { draft: number; in_progress: number; complete: number; workflow?: number; published?: number };
  articleCount?: number;
  onOpenClientSettings?: () => void;
  // Client switcher props
  clients?: ClientWithBriefCount[];
  onSwitchClient?: (clientId: string, clientName: string, logoUrl?: string, brandColor?: string) => void;
  selectedClientId?: string | null;
}

const ClientIdentityBlock: React.FC<{
  clientName?: string;
  clientLogoUrl?: string | null;
  clientBrandColor?: string | null;
}> = ({ clientName, clientLogoUrl, clientBrandColor }) => {
  if (!clientName) return null;
  const initials = clientName.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 mb-4">
      {clientLogoUrl ? (
        <img
          src={clientLogoUrl}
          alt=""
          className="w-8 h-8 rounded-lg object-contain border border-gray-100"
        />
      ) : (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
          style={clientBrandColor
            ? { backgroundColor: clientBrandColor, color: '#fff' }
            : { backgroundColor: '#f0fdfa', color: '#0d9488' }
          }
        >
          {initials}
        </div>
      )}
      <span className="text-sm font-heading font-semibold text-foreground truncate">{clientName}</span>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  briefingStep = 1,
  selectedSection,
  onSelectSection,
  onGoToStep,
  staleSteps = new Set(),
  isUploadedBrief = false,
  clientName,
  clientLogoUrl,
  clientBrandColor,
  onBackToClients,
  briefCounts,
  articleCount,
  onOpenClientSettings,
  clients,
  onSwitchClient,
  selectedClientId,
}) => {
  // Brief list sidebar
  if (currentView === 'brief_list') {
    return (
      <aside className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          {onBackToClients && (
            <button onClick={onBackToClients} className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal transition-colors mb-6 group">
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Clients
            </button>
          )}

          <div className="mb-6">
            {clients && clients.length > 0 && onSwitchClient ? (
              <ClientSwitcherDropdown
                clients={clients}
                selectedClientId={selectedClientId}
                onSwitchClient={onSwitchClient}
                onViewAllClients={onBackToClients}
                trigger={
                  <button className="flex items-center gap-3 w-full group text-left">
                    {clientLogoUrl ? (
                      <img src={clientLogoUrl} alt="" className="w-8 h-8 rounded-lg object-contain border border-gray-100" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={clientBrandColor ? { backgroundColor: clientBrandColor, color: '#fff' } : { backgroundColor: '#f0fdfa', color: '#0d9488' }}
                      >
                        {(clientName || 'CL').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-heading font-semibold text-foreground truncate flex-1">{clientName || 'Client'}</span>
                    <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-teal transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                }
              />
            ) : (
              <ClientIdentityBlock clientName={clientName || 'Client'} clientLogoUrl={clientLogoUrl} clientBrandColor={clientBrandColor} />
            )}
          </div>

          <h4 className="text-xs font-heading font-semibold text-gray-400 uppercase tracking-wider mb-3">Overview</h4>
          <nav className="space-y-1">
            <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 rounded-md">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                Drafts
              </span>
              <span className="text-gray-400">{briefCounts?.draft || 0}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 rounded-md">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                In Progress
              </span>
              <span className="text-gray-400">{briefCounts?.in_progress || 0}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 rounded-md">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Complete
              </span>
              <span className="text-gray-400">{briefCounts?.complete || 0}</span>
            </div>
            {(briefCounts?.workflow || 0) > 0 && (
              <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 rounded-md">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  In Workflow
                </span>
                <span className="text-gray-400">{briefCounts.workflow}</span>
              </div>
            )}
            {(briefCounts?.published || 0) > 0 && (
              <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 rounded-md">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Published
                </span>
                <span className="text-gray-400">{briefCounts.published}</span>
              </div>
            )}
          </nav>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-600 rounded-md">
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Articles
              </span>
              <span className="text-gray-400">{articleCount || 0}</span>
            </div>
          </div>

          {onOpenClientSettings && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={onOpenClientSettings}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-teal hover:bg-gray-100 rounded-md transition-colors w-full"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Client Settings
              </button>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Briefing stepper
  if (currentView === 'briefing') {
    return (
      <aside className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <ClientIdentityBlock clientName={clientName} clientLogoUrl={clientLogoUrl} clientBrandColor={clientBrandColor} />
          <h3 className="text-xs font-heading font-semibold text-gray-400 uppercase tracking-wider mb-4">Brief Progress</h3>
          <nav aria-label="Progress">
            <ol role="list" className="space-y-1">
              {BRIEFING_STEPS.map((step, index) => {
                const isCompleted = briefingStep > step.uiStep;
                const isActive = briefingStep === step.uiStep;
                return (
                  <li key={step.title} className="relative">
                    {index !== BRIEFING_STEPS.length - 1 && (
                      <div
                        className={`absolute left-[18px] top-10 h-[calc(100%-8px)] w-0.5 transition-colors duration-300 ${
                          isCompleted ? 'bg-teal' : 'bg-gray-200'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <div
                      className={`relative flex items-center gap-3 p-2 rounded-md transition-all duration-200 ${
                        isActive ? 'bg-teal-50' : 'hover:bg-gray-100'
                      } ${isCompleted && onGoToStep ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (isCompleted && onGoToStep) {
                          onGoToStep(step.uiStep);
                        }
                      }}
                    >
                      <span className={`relative z-10 w-9 h-9 flex items-center justify-center rounded-full border-2 transition-all duration-200 ${
                        isCompleted
                          ? 'bg-teal border-teal shadow-glow-teal-sm'
                          : isActive
                            ? 'border-teal bg-white'
                            : 'border-gray-200 bg-white'
                      }`}>
                        <span className={`transition-colors duration-200 ${
                          isCompleted
                            ? 'text-white'
                            : isActive
                              ? 'text-teal'
                              : 'text-gray-400'
                        }`}>
                          {isCompleted ? <CheckIcon className="h-4 w-4" /> : step.icon}
                        </span>
                      </span>
                      <div className="flex flex-col">
                        <span className={`text-sm font-heading font-medium transition-colors duration-200 ${
                          isActive ? 'text-foreground' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {step.title}
                        </span>
                        {isActive && (
                          <span className="text-xs text-teal">Current step</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </aside>
    );
  }

  // Dashboard nav
  if (currentView === 'dashboard') {
    return (
      <aside className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <ClientIdentityBlock clientName={clientName} clientLogoUrl={clientLogoUrl} clientBrandColor={clientBrandColor} />
          <h3 className="text-xs font-heading font-semibold text-gray-400 uppercase tracking-wider">Dashboard</h3>
          <nav className="mt-2 space-y-1">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onSelectSection?.(null); }}
              className={`flex items-center px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                selectedSection === null
                  ? 'bg-teal-50 text-teal'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <HomeIcon className="mr-3 h-5 w-5" />
              <span>Overview</span>
            </a>
          </nav>

          {!isUploadedBrief && (
            <>
              <h3 className="mt-6 text-xs font-heading font-semibold text-gray-400 uppercase tracking-wider">Brief Sections</h3>
              <nav className="mt-2 space-y-1">
                {DASHBOARD_SECTIONS.map(section => (
                  <a
                    key={section.logicalStep}
                    href="#"
                    onClick={(e) => { e.preventDefault(); onSelectSection?.(section.logicalStep); }}
                    className={`flex items-center px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                      selectedSection === section.logicalStep
                        ? 'bg-teal-50 text-teal'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3">{section.icon}</span>
                    <span className="flex-1">{section.title}</span>
                    {staleSteps.has(section.logicalStep) && (
                      <div className="relative group">
                        <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
                        <span className="absolute right-0 -top-8 w-max bg-white text-foreground text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-gray-200">
                          This section is stale
                        </span>
                      </div>
                    )}
                  </a>
                ))}
              </nav>
            </>
          )}
        </div>
      </aside>
    );
  }

  // Setup views
  if (currentView === 'initial_input' || currentView === 'context_input' || currentView === 'visualization') {
    const setupSteps = [
      { key: 'initial_input', label: 'Setup' },
      { key: 'context_input', label: 'Context' },
      { key: 'visualization', label: 'Review' },
    ];
    const currentIndex = setupSteps.findIndex(s => s.key === currentView);

    return (
      <aside className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <ClientIdentityBlock clientName={clientName} clientLogoUrl={clientLogoUrl} clientBrandColor={clientBrandColor} />
          <h3 className="text-xs font-heading font-semibold text-gray-400 uppercase tracking-wider mb-4">Getting Started</h3>
          <nav>
            <ol className="space-y-1">
              {setupSteps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;
                return (
                  <li key={step.key}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                      isActive ? 'bg-teal-50' : ''
                    }`}>
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full border-2 text-xs font-medium transition-all ${
                        isCompleted
                          ? 'bg-teal border-teal text-white'
                          : isActive
                            ? 'border-teal text-teal bg-transparent'
                            : 'border-gray-200 text-gray-400 bg-transparent'
                      }`}>
                        {isCompleted ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className={`text-sm font-heading font-medium ${
                        isActive ? 'text-foreground' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </aside>
    );
  }

  // Content generation
  if (currentView === 'content_generation') {
    return (
      <aside className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <ClientIdentityBlock clientName={clientName} clientLogoUrl={clientLogoUrl} clientBrandColor={clientBrandColor} />
          <h3 className="text-xs font-heading font-semibold text-gray-400 uppercase tracking-wider mb-4">Article Generation</h3>
          <p className="text-sm text-gray-500">Writing your article section by section...</p>
        </div>
      </aside>
    );
  }

  return null;
};

export default Sidebar;
