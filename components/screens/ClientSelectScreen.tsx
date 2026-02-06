// Client Select Screen - Choose a client folder
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAccessibleClients, createClient, updateClient, deleteClient } from '../../services/clientService';
import { toast } from 'sonner';
import type { ClientWithBriefCount } from '../../types/database';
import ClientCard from '../clients/ClientCard';
import Button from '../Button';
import {
  Card,
  Input,
  Textarea,
  Alert,
  Modal,
  Skeleton,
  FloatingPanel,
  FloatingPanelHeader,
  FloatingPanelItem,
  FloatingPanelFooter,
  Progress,
} from '../ui';

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
  // Background generation props - now supports multiple parallel generations
  generatingBriefs?: Record<string, GeneratingBrief>;
  onViewGeneratingBrief?: (briefId: string) => void;
}

const ClientSelectScreen: React.FC<ClientSelectScreenProps> = ({
  onSelectClient,
  generatingBriefs = {},
  onViewGeneratingBrief,
}) => {
  const { userName, isAdmin } = useAuth();
  const [clients, setClients] = useState<ClientWithBriefCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create client modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDescription, setNewClientDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit client modal state
  const [editingClient, setEditingClient] = useState<ClientWithBriefCount | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientDescription, setEditClientDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Delete client modal state
  const [deletingClient, setDeletingClient] = useState<ClientWithBriefCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'created' | 'briefs'>('name');

  // Load-more pagination
  const [visibleCount, setVisibleCount] = useState(12);
  const CLIENT_PAGE_SIZE = 12;

  // Get list of generating brief IDs
  const generatingBriefIds = Object.keys(generatingBriefs);
  const hasGeneratingBriefs = generatingBriefIds.length > 0;

  // Check if a specific client has any generating briefs
  const getGeneratingBriefsForClient = (clientId: string) => {
    return generatingBriefIds.filter(briefId => generatingBriefs[briefId].clientId === clientId);
  };

  // Get generation status text for a brief
  const getGenerationStatusText = (status: GenerationStatus, step: number | null) => {
    switch (status) {
      case 'analyzing_competitors':
        return 'Analyzing competitors...';
      case 'generating_brief':
        return `Generating brief... ${step ? `(${step}/7)` : ''}`;
      case 'generating_content':
        return 'Generating content...';
      default:
        return '';
    }
  };

  // Get progress value for generation
  const getGenerationProgress = (status: GenerationStatus, step: number | null) => {
    if (status === 'analyzing_competitors') return 15;
    if (status === 'generating_brief' && step) return 20 + (step / 7) * 60;
    if (status === 'generating_content') return 85;
    return 0;
  };

  // Filter clients by search
  const filteredClients = useMemo(() => {
    let result = clients.filter((client) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        client.name.toLowerCase().includes(query) ||
        client.description?.toLowerCase().includes(query)
      );
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'briefs':
          return b.brief_count - a.brief_count;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [clients, searchQuery, sortBy]);

  // Paginated clients
  const paginatedClients = filteredClients.slice(0, visibleCount);
  const hasMoreClients = filteredClients.length > visibleCount;

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

  // Edit client
  const handleEditClient = (client: ClientWithBriefCount) => {
    setEditingClient(client);
    setEditClientName(client.name);
    setEditClientDescription(client.description || '');
  };

  const handleEditSubmit = async () => {
    if (!editingClient || !editClientName.trim()) return;
    setIsEditing(true);

    const { data, error: editError } = await updateClient(editingClient.id, {
      name: editClientName.trim(),
      description: editClientDescription.trim() || null,
    });

    if (editError) {
      toast.error(`Failed to update client: ${editError}`);
    } else if (data) {
      setClients(prev => prev.map(c =>
        c.id === editingClient.id
          ? { ...c, name: data.name, description: data.description }
          : c
      ));
      toast.success('Client updated');
    }

    setIsEditing(false);
    setEditingClient(null);
  };

  // Delete client
  const handleDeleteClient = (client: ClientWithBriefCount) => {
    setDeletingClient(client);
  };

  const handleDeleteConfirmed = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);

    const { error: deleteError } = await deleteClient(deletingClient.id);

    if (deleteError) {
      toast.error(`Failed to delete client: ${deleteError}`);
    } else {
      setClients(prev => prev.filter(c => c.id !== deletingClient.id));
      toast.success('Client deleted');
    }

    setIsDeleting(false);
    setDeletingClient(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            Welcome back, {userName || 'User'}
          </h1>
          <p className="text-gray-600 mt-1">Select a client folder to view or create briefs</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            New Client
          </Button>
        </div>
      </div>

      {/* Search and Sort */}
      {clients.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal focus:border-teal"
          >
            <option value="name">Name A-Z</option>
            <option value="updated">Last Updated</option>
            <option value="created">Newest First</option>
            <option value="briefs">Most Briefs</option>
          </select>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="error" title="Failed to load clients" dismissible onDismiss={() => setError(null)}>
          {error}
          <Button variant="secondary" size="sm" onClick={loadClients} className="mt-3">
            Try Again
          </Button>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} padding="md">
              <div className="flex items-start">
                <Skeleton variant="rectangular" width={48} height={48} className="rounded-lg mr-4" />
                <div className="flex-1">
                  <Skeleton variant="text" width="70%" height={24} className="mb-2" />
                  <Skeleton variant="text" width="90%" height={16} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                <Skeleton variant="text" width={60} height={16} />
                <Skeleton variant="text" width={100} height={16} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && clients.length === 0 && (
        <Card variant="default" padding="lg" className="text-center">
          <div className="py-8">
            <div className="mx-auto w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-teal"
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
            </div>
            <h3 className="text-lg font-heading font-semibold text-gray-900 mb-2">
              No client folders yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Create your first client folder to start organizing your briefs.
            </p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)} glow>
              Create First Client
            </Button>
          </div>
        </Card>
      )}

      {/* Client grid */}
      {!isLoading && !error && filteredClients.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedClients.map((client) => (
              <div key={client.id} className="relative group">
                <ClientCard
                  client={client}
                  onClick={() => onSelectClient(client.id, client.name)}
                  isGenerating={getGeneratingBriefsForClient(client.id).length > 0}
                  generatingCount={getGeneratingBriefsForClient(client.id).length}
                  colorIndex={clients.indexOf(client)}
                />
                {/* Edit/Delete overlay buttons */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditClient(client); }}
                    className="p-1.5 bg-white rounded-md shadow-sm border border-gray-200 text-gray-500 hover:text-teal hover:border-teal transition-colors"
                    title="Edit client"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClient(client); }}
                    className="p-1.5 bg-white rounded-md shadow-sm border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300 transition-colors"
                    title="Delete client"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Load More */}
          {hasMoreClients && (
            <div className="text-center mt-6">
              <Button
                variant="secondary"
                onClick={() => setVisibleCount(prev => prev + CLIENT_PAGE_SIZE)}
              >
                Load More ({filteredClients.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}

      {/* No search results */}
      {!isLoading && !error && clients.length > 0 && filteredClients.length === 0 && (
        <Card variant="default" padding="lg" className="text-center">
          <p className="text-gray-600">No clients match your search.</p>
          <Button variant="secondary" onClick={() => setSearchQuery('')} className="mt-4">
            Clear Search
          </Button>
        </Card>
      )}

      {/* Background Generation Indicator */}
      {hasGeneratingBriefs && (
        <FloatingPanel position="bottom-right" variant="warning">
          <FloatingPanelHeader
            icon={
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            }
          >
            {generatingBriefIds.length} {generatingBriefIds.length === 1 ? 'brief' : 'briefs'} generating
          </FloatingPanelHeader>

          {generatingBriefIds.map((briefId) => {
            const brief = generatingBriefs[briefId];
            return (
              <FloatingPanelItem
                key={briefId}
                title={brief.clientName}
                status={getGenerationStatusText(brief.status, brief.step)}
                progress={
                  <Progress
                    value={getGenerationProgress(brief.status, brief.step)}
                    size="sm"
                    color="yellow"
                  />
                }
                action={
                  onViewGeneratingBrief && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewGeneratingBrief(briefId)}
                    >
                      View
                    </Button>
                  )
                }
              />
            );
          })}

          <FloatingPanelFooter>
            Keep this tab open to continue
          </FloatingPanelFooter>
        </FloatingPanel>
      )}

      {/* Create Client Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        title="Create New Client"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateClient}
              loading={isCreating}
              disabled={!newClientName.trim()}
            >
              Create Client
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Client Name"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            placeholder="e.g., Acme Corp"
            disabled={isCreating}
            error={createError && !newClientName.trim() ? 'Client name is required' : undefined}
          />

          <Textarea
            label="Description"
            hint="Optional"
            value={newClientDescription}
            onChange={(e) => setNewClientDescription(e.target.value)}
            placeholder="Brief description of the client"
            rows={3}
            disabled={isCreating}
          />

          {createError && newClientName.trim() && (
            <Alert variant="error">{createError}</Alert>
          )}
        </div>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        title="Edit Client"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingClient(null)} disabled={isEditing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleEditSubmit}
              loading={isEditing}
              disabled={!editClientName.trim()}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Client Name"
            value={editClientName}
            onChange={(e) => setEditClientName(e.target.value)}
            placeholder="e.g., Acme Corp"
            disabled={isEditing}
          />
          <Textarea
            label="Description"
            hint="Optional"
            value={editClientDescription}
            onChange={(e) => setEditClientDescription(e.target.value)}
            placeholder="Brief description of the client"
            rows={3}
            disabled={isEditing}
          />
        </div>
      </Modal>

      {/* Delete Client Confirmation Modal */}
      <Modal
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        title="Delete Client"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeletingClient(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConfirmed} loading={isDeleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to delete <strong>{deletingClient?.name}</strong>?
          This will permanently delete all briefs and articles under this client.
        </p>
      </Modal>
    </div>
  );
};

export default ClientSelectScreen;
