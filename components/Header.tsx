import React from 'react';
import { useSound } from '../App';
import { Volume2Icon, VolumeXIcon, ChevronRightIcon } from './Icon';
import SaveStatusIndicator from './SaveStatusIndicator';
import type { SaveStatus } from '../types/appState';

interface HeaderProps {
  isSupabaseMode?: boolean;
  clientName?: string | null;
  onBackToBriefList?: () => void;
  saveStatus?: SaveStatus;
  lastSavedAt?: Date | null;
}

const Header: React.FC<HeaderProps> = ({
  isSupabaseMode,
  clientName,
  onBackToBriefList,
  saveStatus = 'saved',
  lastSavedAt,
}) => {
  const sound = useSound();

  return (
    <header className="bg-surface-elevated/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Breadcrumbs */}
          <div className="flex items-center gap-4">
            <img
              src="https://cutinside.com/llm-perception-tool/logo.png"
              alt="CUT INSIDE Logo"
              className="h-7 w-auto"
            />
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-border-subtle">
              <p className="text-sm text-text-secondary font-heading tracking-wider">Content Brief Generator</p>
              {isSupabaseMode && clientName && (
                <>
                  <ChevronRightIcon className="h-3.5 w-3.5 text-text-muted" />
                  {onBackToBriefList ? (
                    <button
                      onClick={onBackToBriefList}
                      className="text-sm text-text-muted hover:text-teal transition-colors font-heading"
                    >
                      {clientName}
                    </button>
                  ) : (
                    <span className="text-sm text-text-muted font-heading">{clientName}</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right side: Save Status + Sound Toggle */}
          <div className="flex items-center gap-4">
            {isSupabaseMode && (
              <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt ?? null} />
            )}
            <button
              onClick={sound?.toggleSound}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-radius-md transition-all ${
                sound?.isSoundEnabled
                  ? 'bg-teal/10 text-teal hover:bg-teal/20'
                  : 'bg-surface-hover text-text-muted hover:bg-surface-active hover:text-text-secondary'
              }`}
              title={sound?.isSoundEnabled ? 'Disable sound effects' : 'Enable sound effects'}
            >
              {sound?.isSoundEnabled ? (
                <Volume2Icon className="h-4 w-4" />
              ) : (
                <VolumeXIcon className="h-4 w-4" />
              )}
              <span className="text-xs font-medium hidden sm:inline">
                {sound?.isSoundEnabled ? 'Sound On' : 'Sound Off'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
