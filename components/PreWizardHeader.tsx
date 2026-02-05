import React from 'react';

export interface PreWizardHeaderProps {
  clientName?: string | null;
  onClientClick?: () => void;
  onLogout?: () => void;
  userName?: string;
}

const ChevronRightSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const LogOutSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const PreWizardHeader: React.FC<PreWizardHeaderProps> = ({
  clientName,
  onClientClick,
  onLogout,
  userName,
}) => {
  return (
    <header className="bg-surface-elevated/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left side: Logo + Title + Breadcrumb */}
          <div className="flex items-center gap-4">
            <img
              src="https://cutinside.com/llm-perception-tool/logo.png"
              alt="CUT INSIDE Logo"
              className="h-7 w-auto"
            />
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-border-subtle">
              <p className="text-sm text-text-secondary font-heading tracking-wider">
                Content Brief Generator
              </p>
              {clientName && (
                <>
                  <ChevronRightSvg className="h-3.5 w-3.5 text-text-muted" />
                  {onClientClick ? (
                    <button
                      onClick={onClientClick}
                      className="text-sm text-text-muted hover:text-teal transition-colors font-heading"
                    >
                      {clientName}
                    </button>
                  ) : (
                    <span className="text-sm text-text-muted font-heading">
                      {clientName}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right side: User name + Sign Out */}
          <div className="flex items-center gap-4">
            {userName && (
              <span className="text-sm text-text-secondary">{userName}</span>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                <LogOutSvg className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default PreWizardHeader;
