import React, { useState, useMemo } from 'react';
import { Popover, PopoverTrigger, PopoverContent, ScrollArea } from './ui';
import { getClientLogoUrl } from '../lib/favicon';
import type { ClientWithBriefCount } from '../types/database';

export interface PreWizardHeaderProps {
  clientName?: string | null;
  clientLogoUrl?: string | null;
  onClientClick?: () => void;
  onLogout?: () => void;
  userName?: string;
  // Client switcher props
  clients?: ClientWithBriefCount[];
  onSwitchClient?: (clientId: string, clientName: string, logoUrl?: string, brandColor?: string) => void;
  selectedClientId?: string | null;
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

const ChevronDownSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6 6 6-6" />
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

const CheckSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/** Get initials from client name (max 2 chars) */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/** Client Switcher Dropdown */
const ClientSwitcherDropdown: React.FC<{
  clients: ClientWithBriefCount[];
  selectedClientId?: string | null;
  onSwitchClient: (clientId: string, clientName: string, logoUrl?: string, brandColor?: string) => void;
  onViewAllClients?: () => void;
  trigger: React.ReactNode;
}> = ({ clients, selectedClientId, onSwitchClient, onViewAllClients, trigger }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0" sideOffset={8}>
        {/* Search */}
        <div className="p-2 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal focus:border-teal placeholder:text-gray-400"
            autoFocus
          />
        </div>

        {/* Client List */}
        <ScrollArea className="max-h-64">
          <div className="py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400 text-center">No clients found</p>
            ) : (
              filtered.map(client => {
                const logoUrl = getClientLogoUrl(client.brand_identity) || undefined;
                const isSelected = client.id === selectedClientId;
                return (
                  <button
                    key={client.id}
                    onClick={() => {
                      onSwitchClient(client.id, client.name, logoUrl, client.brand_identity?.brand_color || undefined);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-teal-50' : ''
                    }`}
                  >
                    {/* Avatar */}
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt=""
                        className="w-6 h-6 rounded object-contain flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-gray-500">{getInitials(client.name)}</span>
                      </div>
                    )}
                    {/* Name + brief count */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm truncate block ${isSelected ? 'font-medium text-teal-700' : 'text-gray-700'}`}>
                        {client.name}
                      </span>
                    </div>
                    {/* Selected checkmark */}
                    {isSelected && <CheckSvg className="w-4 h-4 text-teal flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {onViewAllClients && (
          <div className="border-t border-gray-100 p-1.5">
            <button
              onClick={() => { onViewAllClients(); setOpen(false); setSearch(''); }}
              className="w-full text-sm text-center py-1.5 text-gray-500 hover:text-teal hover:bg-gray-50 rounded-md transition-colors"
            >
              View All Clients
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const PreWizardHeader: React.FC<PreWizardHeaderProps> = ({
  clientName,
  clientLogoUrl,
  onClientClick,
  onLogout,
  userName,
  clients,
  onSwitchClient,
  selectedClientId,
}) => {
  const hasSwitcher = clients && clients.length > 0 && onSwitchClient;

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left side: Logo + Title + Breadcrumb */}
          <div className="flex items-center gap-4">
            <img
              src="https://cutinside.com/wp-content/uploads/2025/01/Logo.svg"
              alt="Cut Inside Logo"
              className="h-7 w-auto"
            />
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-gray-200">
              <p className="text-sm text-gray-600 font-heading tracking-wider">
                Content Brief Generator
              </p>
              {clientName && (
                <>
                  <ChevronRightSvg className="h-3.5 w-3.5 text-gray-400" />
                  <div className="flex items-center gap-1.5">
                    {clientLogoUrl && (
                      <img
                        src={clientLogoUrl}
                        alt=""
                        className="h-5 w-5 rounded object-contain"
                      />
                    )}
                    {hasSwitcher ? (
                      <ClientSwitcherDropdown
                        clients={clients}
                        selectedClientId={selectedClientId}
                        onSwitchClient={onSwitchClient}
                        onViewAllClients={onClientClick}
                        trigger={
                          <button
                            className="flex items-center gap-1 text-sm text-gray-400 hover:text-teal transition-colors font-heading"
                          >
                            {clientName}
                            <ChevronDownSvg className="h-3.5 w-3.5" />
                          </button>
                        }
                      />
                    ) : onClientClick ? (
                      <button
                        onClick={onClientClick}
                        className="text-sm text-gray-400 hover:text-teal transition-colors font-heading"
                      >
                        {clientName}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400 font-heading">
                        {clientName}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right side: User name + Sign Out */}
          <div className="flex items-center gap-4">
            {userName && (
              <span className="text-sm text-gray-600">{userName}</span>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors"
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
