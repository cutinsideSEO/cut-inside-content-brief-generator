import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getClientWithContext, updateClient, deleteClient } from '../../services/clientService';
import { toast } from 'sonner';
import SaveStatusIndicator from '../SaveStatusIndicator';
import Button from '../Button';
import { Badge, Modal } from '../ui';
import type {
  BrandIdentity,
  BrandVoice,
  TargetAudience,
  ContentStrategy,
  OperationalSettings,
  ClientContextFile,
  ClientContextUrl,
} from '../../types/clientProfile';
import type { SaveStatus } from '../../types/appState';
import { getClientLogoUrl } from '../../lib/favicon';

// Section components
import BrandIdentitySection from '../clients/profile/BrandIdentitySection';
import BrandVoiceSection from '../clients/profile/BrandVoiceSection';
import TargetAudienceSection from '../clients/profile/TargetAudienceSection';
import ContentStrategySection from '../clients/profile/ContentStrategySection';
import FilesUrlsSection from '../clients/profile/FilesUrlsSection';
import DefaultsSection from '../clients/profile/DefaultsSection';

type ProfileSection = 'identity' | 'voice' | 'audience' | 'strategy' | 'files' | 'defaults' | 'danger';
type TrackableSection = Exclude<ProfileSection, 'danger'>;

interface SectionProgress {
  completed: number;
  total: number;
}

const SECTIONS: { id: ProfileSection; label: string; icon: JSX.Element }[] = [
  {
    id: 'identity',
    label: 'Brand Identity',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    id: 'voice',
    label: 'Brand Voice',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
  },
  {
    id: 'audience',
    label: 'Target Audience',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
  {
    id: 'strategy',
    label: 'Content Strategy',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  },
  {
    id: 'files',
    label: 'Files & URLs',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  },
  {
    id: 'defaults',
    label: 'Defaults',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    id: 'danger',
    label: 'Danger Zone',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  },
];

const SECTION_DESCRIPTIONS: Record<ProfileSection, string> = {
  identity: 'Core brand information and positioning.',
  voice: 'Tone, writing style, and messaging personality.',
  audience: 'Who you are speaking to and what they care about.',
  strategy: 'Content rules, SEO direction, and competitor signals.',
  files: 'Reference files and URLs used during generation.',
  defaults: 'Default generation settings for this client.',
  danger: 'Irreversible and destructive actions.',
};

interface ClientProfileScreenProps {
  clientId: string;
  onBack: () => void;
  isCreateMode?: boolean;
}

const ClientProfileScreen: React.FC<ClientProfileScreenProps> = ({
  clientId,
  onBack,
  isCreateMode = false,
}) => {
  const [activeSection, setActiveSection] = useState<ProfileSection>('identity');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Client data state
  const [clientName, setClientName] = useState('');
  const [clientDescription, setClientDescription] = useState('');
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>({});
  const [brandVoice, setBrandVoice] = useState<BrandVoice>({});
  const [targetAudience, setTargetAudience] = useState<TargetAudience>({});
  const [contentStrategy, setContentStrategy] = useState<ContentStrategy>({});
  const [operationalSettings, setOperationalSettings] = useState<OperationalSettings>({});
  const [contextFiles, setContextFiles] = useState<ClientContextFile[]>([]);
  const [contextUrls, setContextUrls] = useState<ClientContextUrl[]>([]);

  // Auto-save debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // Load client data
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await getClientWithContext(clientId);
      if (data) {
        setClientName(data.name);
        setClientDescription(data.description || '');
        setBrandIdentity(data.brand_identity || {});
        setBrandVoice(data.brand_voice || {});
        setTargetAudience(data.target_audience || {});
        setContentStrategy(data.content_strategy || {});
        setOperationalSettings(data.operational_settings || {});
        setContextFiles(data.context_files || []);
        setContextUrls(data.context_urls || []);
        setLastSavedAt(data.updated_at ? new Date(data.updated_at) : null);
        // Set initial snapshot for change detection
        lastSavedRef.current = JSON.stringify({
          name: data.name,
          description: data.description || '',
          brand_identity: data.brand_identity || {},
          brand_voice: data.brand_voice || {},
          target_audience: data.target_audience || {},
          content_strategy: data.content_strategy || {},
          operational_settings: data.operational_settings || {},
        });
      } else if (error) {
        toast.error(`Failed to load client: ${error}`);
      }
      setIsLoading(false);
    };
    load();
  }, [clientId]);

  // Auto-save on changes
  const triggerSave = useCallback(() => {
    const currentData = JSON.stringify({
      name: clientName,
      description: clientDescription,
      brand_identity: brandIdentity,
      brand_voice: brandVoice,
      target_audience: targetAudience,
      content_strategy: contentStrategy,
      operational_settings: operationalSettings,
    });

    // Skip if nothing changed
    if (currentData === lastSavedRef.current) return;

    setSaveStatus('unsaved');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      const { error } = await updateClient(clientId, {
        name: clientName,
        description: clientDescription || null,
        brand_identity: brandIdentity,
        brand_voice: brandVoice,
        target_audience: targetAudience,
        content_strategy: contentStrategy,
        operational_settings: operationalSettings,
      });

      if (error) {
        setSaveStatus('error');
        toast.error('Failed to save changes');
      } else {
        setSaveStatus('saved');
        setLastSavedAt(new Date());
        lastSavedRef.current = currentData;
      }
    }, 500);
  }, [clientId, clientName, clientDescription, brandIdentity, brandVoice, targetAudience, contentStrategy, operationalSettings]);

  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (!isLoading) {
      triggerSave();
    }
  }, [clientName, clientDescription, brandIdentity, brandVoice, targetAudience, contentStrategy, operationalSettings, triggerSave, isLoading]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const hasText = (value?: string | null) => Boolean(value && value.trim().length > 0);
  const hasItems = (value?: unknown[] | null) => Boolean(value && value.length > 0);
  const buildProgress = (checks: boolean[]): SectionProgress => ({
    completed: checks.filter(Boolean).length,
    total: checks.length,
  });

  const sectionProgress = useMemo<Record<TrackableSection, SectionProgress>>(() => {
    return {
      identity: buildProgress([
        hasText(clientName),
        hasText(clientDescription),
        hasText(brandIdentity.brand_name),
        hasText(brandIdentity.positioning),
        Boolean(brandIdentity.industry),
        hasText(brandIdentity.website),
      ]),
      voice: buildProgress([
        hasItems(brandVoice.tone_descriptors),
        Boolean(brandVoice.writing_style),
        Boolean(brandVoice.technical_level),
        hasItems(brandVoice.values),
        hasItems(brandVoice.usps),
        hasItems(brandVoice.personality_traits),
      ]),
      audience: buildProgress([
        Boolean(targetAudience.audience_type),
        hasText(targetAudience.demographics),
        hasItems(targetAudience.job_titles),
        hasItems(targetAudience.personas),
      ]),
      strategy: buildProgress([
        hasItems(contentStrategy.content_dos),
        hasItems(contentStrategy.content_donts),
        hasItems(contentStrategy.preferred_terms),
        hasItems(contentStrategy.banned_terms),
        hasText(contentStrategy.seo_guidelines),
        hasItems(contentStrategy.known_competitors),
      ]),
      files: buildProgress([
        contextFiles.length > 0,
        contextFiles.some((file) => file.parse_status === 'done'),
        contextUrls.length > 0,
        contextUrls.some((url) => url.scrape_status === 'done'),
      ]),
      defaults: buildProgress([
        hasText(operationalSettings.default_model),
        hasText(operationalSettings.default_thinking_level),
        hasText(operationalSettings.contact_info),
        hasText(contentStrategy.default_output_language),
        hasText(contentStrategy.default_serp_language),
        hasText(contentStrategy.default_serp_country),
      ]),
    };
  }, [
    brandIdentity.brand_name,
    brandIdentity.industry,
    brandIdentity.positioning,
    brandIdentity.website,
    brandVoice.personality_traits,
    brandVoice.technical_level,
    brandVoice.tone_descriptors,
    brandVoice.usps,
    brandVoice.values,
    brandVoice.writing_style,
    clientDescription,
    clientName,
    contentStrategy.banned_terms,
    contentStrategy.content_donts,
    contentStrategy.content_dos,
    contentStrategy.default_output_language,
    contentStrategy.default_serp_country,
    contentStrategy.default_serp_language,
    contentStrategy.known_competitors,
    contentStrategy.preferred_terms,
    contentStrategy.seo_guidelines,
    contextFiles,
    contextUrls,
    operationalSettings.contact_info,
    operationalSettings.default_model,
    operationalSettings.default_thinking_level,
    targetAudience.audience_type,
    targetAudience.demographics,
    targetAudience.job_titles,
    targetAudience.personas,
  ]);

  const overallCompletion = useMemo(() => {
    const values = Object.values(sectionProgress);
    const total = values.reduce((sum, item) => sum + item.total, 0);
    const completed = values.reduce((sum, item) => sum + item.completed, 0);
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }, [sectionProgress]);

  const activeSectionProgress = activeSection === 'danger' ? null : sectionProgress[activeSection as TrackableSection];

  // Delete handler
  const handleDelete = async () => {
    const { error } = await deleteClient(clientId);
    if (error) {
      toast.error(`Failed to delete: ${error}`);
    } else {
      toast.success('Client deleted');
      onBack();
    }
    setShowDeleteConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Nav */}
      <aside className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal transition-colors mb-6 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Client identity */}
          <div className="mb-6 flex items-center gap-3">
            {getClientLogoUrl(brandIdentity) ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100">
                <img
                  src={getClientLogoUrl(brandIdentity)!}
                  alt={clientName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : brandIdentity.brand_color ? (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-heading font-bold text-sm"
                style={{ backgroundColor: brandIdentity.brand_color }}
              >
                {clientName.slice(0, 2).toUpperCase()}
              </div>
            ) : (
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
              </div>
            )}
            <h3 className="text-sm font-heading font-semibold text-foreground truncate max-w-[160px]">
              {clientName || 'New Client'}
            </h3>
          </div>

          <div className="mb-6 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Profile completion</span>
              <span className="font-semibold text-foreground">{overallCompletion}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full bg-teal transition-all duration-300" style={{ width: `${overallCompletion}%` }} />
            </div>
          </div>

          {/* Section nav */}
          <nav className="space-y-0.5">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-all ${
                  activeSection === section.id
                    ? 'bg-teal-50 text-teal font-medium'
                    : section.id === 'danger'
                      ? 'text-gray-500 hover:bg-red-50 hover:text-red-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="flex-shrink-0">{section.icon}</span>
                <span className="truncate text-left">{section.label}</span>
                {section.id !== 'danger' && (
                  <span
                    className={`ml-auto text-[11px] rounded px-1.5 py-0.5 ${
                      sectionProgress[section.id as TrackableSection].completed === sectionProgress[section.id as TrackableSection].total
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {sectionProgress[section.id as TrackableSection].completed}/{sectionProgress[section.id as TrackableSection].total}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
          <div className="sticky top-0 z-10 -mx-2 px-2 py-4 mb-6 bg-background/95 backdrop-blur border-b border-border">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-heading font-semibold text-foreground">
                  {SECTIONS.find((section) => section.id === activeSection)?.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {SECTION_DESCRIPTIONS[activeSection]}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {activeSectionProgress && (
                  <Badge variant={activeSectionProgress.completed === activeSectionProgress.total ? 'success' : 'default'} size="sm">
                    {activeSectionProgress.completed}/{activeSectionProgress.total} configured
                  </Badge>
                )}
                <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
              </div>
            </div>
          </div>

          {/* Active section */}
          {activeSection === 'identity' && (
            <BrandIdentitySection
              data={brandIdentity}
              clientName={clientName}
              clientDescription={clientDescription}
              onChange={setBrandIdentity}
              onClientNameChange={setClientName}
              onClientDescriptionChange={setClientDescription}
            />
          )}

          {activeSection === 'voice' && (
            <BrandVoiceSection data={brandVoice} onChange={setBrandVoice} />
          )}

          {activeSection === 'audience' && (
            <TargetAudienceSection data={targetAudience} onChange={setTargetAudience} />
          )}

          {activeSection === 'strategy' && (
            <ContentStrategySection data={contentStrategy} onChange={setContentStrategy} />
          )}

          {activeSection === 'files' && (
            <FilesUrlsSection
              clientId={clientId}
              files={contextFiles}
              urls={contextUrls}
              onFilesChange={setContextFiles}
              onUrlsChange={setContextUrls}
            />
          )}

          {activeSection === 'defaults' && (
            <DefaultsSection
              contentStrategy={contentStrategy}
              operationalSettings={operationalSettings}
              onContentStrategyChange={setContentStrategy}
              onOperationalSettingsChange={setOperationalSettings}
            />
          )}

          {activeSection === 'danger' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-base font-heading font-semibold text-red-700">Delete this client workspace</h3>
                    <p className="text-sm text-red-700/80 mt-1">
                      This permanently removes the client, its briefs, articles, and profile context.
                      This action cannot be undone.
                    </p>
                    <div className="mt-4">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Delete Client Permanently
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Client"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Delete Permanently
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to permanently delete <strong>{clientName}</strong> and all its briefs? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default ClientProfileScreen;
