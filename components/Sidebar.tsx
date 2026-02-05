import React from 'react';
import { FlagIcon, KeyIcon, FileSearchIcon, PuzzleIcon, ListTreeIcon, HelpCircleIcon, FileCodeIcon, CheckIcon, HomeIcon, AlertTriangleIcon } from './Icon';
import type { ContentBrief } from '../types';

type AppView = 'initial_input' | 'context_input' | 'visualization' | 'briefing' | 'dashboard' | 'content_generation' | 'brief_upload';

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
  // Briefing mode props
  briefingStep?: number;
  // Dashboard mode props
  selectedSection?: number | null;
  onSelectSection?: (section: number | null) => void;
  staleSteps?: Set<number>;
  isUploadedBrief?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  briefingStep = 1,
  selectedSection,
  onSelectSection,
  staleSteps = new Set(),
  isUploadedBrief = false,
}) => {
  // Briefing stepper
  if (currentView === 'briefing') {
    return (
      <aside className="w-64 flex-shrink-0 bg-surface-elevated border-r border-border overflow-y-auto">
        <div className="p-4">
          <h3 className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider mb-4">Brief Progress</h3>
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
                          isCompleted ? 'bg-teal' : 'bg-border'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <div className={`relative flex items-center gap-3 p-2 rounded-radius-md transition-all duration-200 ${
                      isActive ? 'bg-teal/10' : 'hover:bg-surface-hover'
                    }`}>
                      <span className={`relative z-10 w-9 h-9 flex items-center justify-center rounded-full border-2 transition-all duration-200 ${
                        isCompleted
                          ? 'bg-teal border-teal shadow-glow-teal-sm'
                          : isActive
                            ? 'border-teal bg-surface-elevated'
                            : 'border-border bg-surface-elevated'
                      }`}>
                        <span className={`transition-colors duration-200 ${
                          isCompleted
                            ? 'text-surface-primary'
                            : isActive
                              ? 'text-teal'
                              : 'text-text-muted'
                        }`}>
                          {isCompleted ? <CheckIcon className="h-4 w-4" /> : step.icon}
                        </span>
                      </span>
                      <div className="flex flex-col">
                        <span className={`text-sm font-heading font-medium transition-colors duration-200 ${
                          isActive ? 'text-text-primary' : isCompleted ? 'text-text-secondary' : 'text-text-muted'
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
      <aside className="w-64 flex-shrink-0 bg-surface-elevated border-r border-border overflow-y-auto">
        <div className="p-4">
          <h3 className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">Dashboard</h3>
          <nav className="mt-2 space-y-1">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onSelectSection?.(null); }}
              className={`flex items-center px-3 py-2 text-sm font-semibold rounded-radius-md transition-colors ${
                selectedSection === null
                  ? 'bg-teal/20 text-teal'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <HomeIcon className="mr-3 h-5 w-5" />
              <span>Overview</span>
            </a>
          </nav>

          {!isUploadedBrief && (
            <>
              <h3 className="mt-6 text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">Brief Sections</h3>
              <nav className="mt-2 space-y-1">
                {DASHBOARD_SECTIONS.map(section => (
                  <a
                    key={section.logicalStep}
                    href="#"
                    onClick={(e) => { e.preventDefault(); onSelectSection?.(section.logicalStep); }}
                    className={`flex items-center px-3 py-2 text-sm font-semibold rounded-radius-md transition-colors ${
                      selectedSection === section.logicalStep
                        ? 'bg-teal/20 text-teal'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    <span className="mr-3">{section.icon}</span>
                    <span className="flex-1">{section.title}</span>
                    {staleSteps.has(section.logicalStep) && (
                      <div className="relative group">
                        <AlertTriangleIcon className="h-4 w-4 text-yellow" />
                        <span className="absolute right-0 -top-8 w-max bg-surface-elevated text-text-primary text-xs rounded-radius-sm py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-border">
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

  // For setup views (initial_input, context_input, visualization) - mini progress indicator
  if (currentView === 'initial_input' || currentView === 'context_input' || currentView === 'visualization') {
    const setupSteps = [
      { key: 'initial_input', label: 'Setup' },
      { key: 'context_input', label: 'Context' },
      { key: 'visualization', label: 'Review' },
    ];
    const currentIndex = setupSteps.findIndex(s => s.key === currentView);

    return (
      <aside className="w-64 flex-shrink-0 bg-surface-elevated border-r border-border overflow-y-auto">
        <div className="p-4">
          <h3 className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider mb-4">Getting Started</h3>
          <nav>
            <ol className="space-y-1">
              {setupSteps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;
                return (
                  <li key={step.key}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-radius-md transition-all ${
                      isActive ? 'bg-teal/10' : ''
                    }`}>
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full border-2 text-xs font-medium transition-all ${
                        isCompleted
                          ? 'bg-teal border-teal text-surface-primary'
                          : isActive
                            ? 'border-teal text-teal bg-transparent'
                            : 'border-border text-text-muted bg-transparent'
                      }`}>
                        {isCompleted ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className={`text-sm font-heading font-medium ${
                        isActive ? 'text-text-primary' : isCompleted ? 'text-text-secondary' : 'text-text-muted'
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

  // Content generation - progress indicator
  if (currentView === 'content_generation') {
    return (
      <aside className="w-64 flex-shrink-0 bg-surface-elevated border-r border-border overflow-y-auto">
        <div className="p-4">
          <h3 className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider mb-4">Article Generation</h3>
          <p className="text-sm text-text-secondary">Writing your article section by section...</p>
        </div>
      </aside>
    );
  }

  // Fallback - no sidebar for brief_upload or unknown views
  return null;
};

export default Sidebar;
