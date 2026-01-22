// Client Select Screen - Choose a client folder
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAccessibleClients, createClient } from '../../services/clientService';
import type { ClientWithBriefCount } from '../../types/database';
import ClientCard from '../clients/ClientCard';
import Button from '../Button';
import Spinner from '../Spinner';

// Generation status type (matches AppWrapper)
type GenerationStatus = 'idle' | 'analyzing_competitors' | 'generating_brief' | 'generating_content';

// Type for tracking individual generation (matches AppWrapper)
interface GeneratingBrief {
  clientId: string;
  clientName: string;
  status: GenerationStatus;
  step: number | null;
}

interface ClientSelectScreenProps {
  onSelectClient: (clientId: string, clientName: string) => void;
  onLogout: () => void;
  // Background generation props - now supports multiple parallel generations
  generatingBriefs?: Record<string, GeneratingBrief>;
  onViewGeneratingBrief?: (briefId: string) => void;
}

const ClientSelectScreen: React.FC<ClientSelectScreenProps> = ({
  onSelectClient,
  onLogout,
  generatingBriefs = {},
  onViewGeneratingBrief,
}) => {
  const { userName, isAdmin } = useAuth();
  const [clients, setClients] = useState<ClientWithBriefCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create client modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDescription, setNewClientDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Get list of generating brief IDs
  const generatingBriefIds = Object.keys(generatingBriefs);
  const hasGeneratingBriefs = generatingBriefIds.length > 0;

  // Check if a specific client has any generating briefs
  const getGeneratingBriefsForClient = (clientId: string) => {
    return generatingBriefIds.filter(briefId => generatingBriefs[briefId].clientId === clientId);
  };

  // Get generation status text for a brief
  const getGenerationStatusText = (status: GenerationStatus) => {
    switch (status) {
      case 'analyzing_competitors':
        return 'Analyzing competitors...';
      case 'generating_brief':
        return 'Generating brief...';
      case 'generating_content':
        return 'Generating content...';
      default:
        return '';
    }
  };

  // Fetch clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getAccessibleClients();

    if (fetchError) {
      setError(fetchError);
    } else {
      setClients(data || []);
    }

    setIsLoading(false);
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      setCreateError('Client name is required');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    const { data, error: createErr } = await createClient(
      newClientName.trim(),
      newClientDescription.trim() || undefined
    );

    if (createErr) {
      setCreateError(createErr);
      setIsCreating(false);
      return;
    }

    if (data) {
      // Add the new client to the list and select it
      setClients((prev) => [{ ...data, brief_count: 0 }, ...prev]);
      setShowCreateModal(false);
      setNewClientName('');
      setNewClientDescription('');
      onSelectClient(data.id, data.name);
    }

    setIsCreating(false);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewClientName('');
    setNewClientDescription('');
    setCreateError(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-brand-white">
            Welcome back, {userName || 'User'}
          </h1>
          <p className="text-grey mt-1">Select a client folder to view or create briefs</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Client
          </Button>
          <Button variant="ghost" onClick={onLogout}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
          <Button variant="secondary" size="sm" onClick={loadClients} className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner size="lg" />
          <p className="text-grey mt-4">Loading clients...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && clients.length === 0 && (
        <div className="text-center py-16 bg-black/20 rounded-lg border border-white/5">
          <svg
            className="mx-auto h-12 w-12 text-grey/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-heading font-semibold text-brand-white">
            No client folders yet
          </h3>
          <p className="mt-2 text-grey">
            Create your first client folder to start organizing your briefs.
          </p>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="mt-6"
          >
            Create First Client
          </Button>
        </div>
      )}

      {/* Client grid */}
      {!isLoading && !error && clients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => onSelectClient(client.id, client.name)}
              isGenerating={getGeneratingBriefsForClient(client.id).length > 0}
              generatingCount={getGeneratingBriefsForClient(client.id).length}
            />
          ))}
        </div>
      )}

      {/* Background Generation Indicator - supports multiple parallel generations */}
      {hasGeneratingBriefs && (
        <div className="fixed bottom-6 right-6 z-40 max-h-[60vh] overflow-y-auto">
          <div className="bg-black/90 border border-yellow/50 rounded-lg p-4 shadow-2xl backdrop-blur-sm max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-3 w-3 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow"></span>
              </span>
              <p className="text-yellow font-medium text-sm">
                {generatingBriefIds.length} {generatingBriefIds.length === 1 ? 'brief' : 'briefs'} generating
              </p>
            </div>

            <div className="space-y-2">
              {generatingBriefIds.map((briefId) => {
                const brief = generatingBriefs[briefId];
                return (
                  <div
                    key={briefId}
                    className="flex items-center justify-between gap-2 p-2 bg-black/50 rounded border border-white/10"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-brand-white truncate">
                        {brief.clientName}
                      </p>
                      <p className="text-xs text-grey">
                        {getGenerationStatusText(brief.status)}
                        {brief.status === 'generating_brief' && brief.step && ` (${brief.step}/7)`}
                      </p>
                    </div>
                    {onViewGeneratingBrief && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewGeneratingBrief(briefId)}
                        className="flex-shrink-0 text-xs px-2 py-1"
                      >
                        View
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-grey/70 text-xs mt-3">
              Keep this tab open to continue
            </p>
          </div>
        </div>
      )}

      {/* Create Client Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-black/90 border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-heading font-bold text-brand-white mb-4">
              Create New Client
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-grey mb-1">
                  Client Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="clientName"
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-brand-white placeholder-grey/50 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                  autoFocus
                  disabled={isCreating}
                />
              </div>

              <div>
                <label htmlFor="clientDescription" className="block text-sm font-medium text-grey mb-1">
                  Description <span className="text-grey/50">(optional)</span>
                </label>
                <textarea
                  id="clientDescription"
                  value={newClientDescription}
                  onChange={(e) => setNewClientDescription(e.target.value)}
                  placeholder="Brief description of the client"
                  rows={3}
                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-brand-white placeholder-grey/50 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal resize-none"
                  disabled={isCreating}
                />
              </div>

              {createError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{createError}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateClient}
                disabled={isCreating || !newClientName.trim()}
              >
                {isCreating ? (
                  <span className="flex items-center">
                    <Spinner size="sm" className="mr-2" />
                    Creating...
                  </span>
                ) : (
                  'Create Client'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientSelectScreen;
