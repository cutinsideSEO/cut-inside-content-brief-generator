import React from 'react';
import { ChevronRightIcon } from './Icon';
import SaveStatusIndicator from './SaveStatusIndicator';
import type { SaveStatus } from '../types/appState';

interface HeaderProps {
  clientName?: string | null;
  clientLogoUrl?: string | null;
  clientBrandColor?: string | null;
  onBackToBriefList?: () => void;
  saveStatus?: SaveStatus;
  lastSavedAt?: Date | null;
}

const Header: React.FC<HeaderProps> = ({
  clientName,
  clientLogoUrl,
  clientBrandColor,
  onBackToBriefList,
  saveStatus = 'saved',
  lastSavedAt,
}) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Breadcrumbs */}
          <div className="flex items-center gap-4">
            <img
              src="https://cutinside.com/wp-content/uploads/2025/01/Logo.svg"
              alt="Cut Inside Logo"
              className="h-7 w-auto"
            />
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-gray-200">
              <p className="text-sm text-gray-600 font-heading tracking-wider">Content Brief Generator</p>
              {clientName && (
                <>
                  <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
                  <div className="flex items-center gap-1.5">
                    {clientLogoUrl && (
                      <img
                        src={clientLogoUrl}
                        alt=""
                        className="h-5 w-5 rounded object-contain"
                      />
                    )}
                    {onBackToBriefList ? (
                      <button
                        onClick={onBackToBriefList}
                        className="text-sm text-gray-400 hover:text-teal transition-colors font-heading"
                        style={clientBrandColor ? { borderBottom: `2px solid ${clientBrandColor}`, paddingBottom: '1px' } : undefined}
                      >
                        {clientName}
                      </button>
                    ) : (
                      <span
                        className="text-sm text-gray-400 font-heading"
                        style={clientBrandColor ? { borderBottom: `2px solid ${clientBrandColor}`, paddingBottom: '1px' } : undefined}
                      >
                        {clientName}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right side: Save Status */}
          <div className="flex items-center gap-4">
            <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt ?? null} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
