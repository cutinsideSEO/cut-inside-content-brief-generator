import React from 'react';
import { useSound } from '../App';
import { Volume2Icon, VolumeXIcon } from './Icon';

const Header: React.FC = () => {
  const sound = useSound();

  return (
    <header className="bg-surface-elevated/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <img
              src="https://cutinside.com/llm-perception-tool/logo.png"
              alt="CUT INSIDE Logo"
              className="h-8 w-auto"
            />
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-border-subtle">
              <p className="text-sm text-text-secondary font-heading tracking-wider">Content Brief Generator</p>
            </div>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center gap-3">
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
