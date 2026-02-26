// BulkGenerationModal - Modal for creating bulk generation batches
import React, { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { createGenerationBatch } from '../../services/batchService';
import type { BriefKeywordGroup } from '../../services/batchService';
import Button from '../Button';
import { Modal, Tabs, Textarea, Select, Card, Badge, Alert } from '../ui';
import { cn } from '@/lib/utils';

// Shared country/language lists (same as InitialInputScreen)
const countries = [
  "Argentina", "Australia", "Austria", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia", "Denmark", "Egypt", "Finland", "France", "Germany", "Hong Kong", "India", "Indonesia", "Ireland", "Israel", "Italy", "Japan", "Malaysia", "Mexico", "Netherlands", "New Zealand", "Norway", "Philippines", "Poland", "Portugal", "Russia", "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "United Arab Emirates", "United Kingdom", "United States", "Vietnam"
];

const languages = [
  "English", "Hebrew", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Russian", "Japanese", "Chinese"
];

interface BulkGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: 'keywords' | 'existing';
  selectedBriefIds: string[];
  clientId: string;
  onBatchCreated: () => void;
}

/**
 * Parse keyword input text into BriefKeywordGroup[].
 *
 * Format: one line per brief. Keywords comma-separated.
 * Optional pipe-separated volumes after keywords.
 *
 * Examples:
 *   "best nas for home, nas storage | 1200, 800"
 *   "ssd vs hdd, solid state drive comparison | 2400, 900"
 *   "raid configuration guide | 1500"
 *   "simple keyword"
 */
function parseKeywordInput(text: string): BriefKeywordGroup[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const groups: BriefKeywordGroup[] = [];

  for (const line of lines) {
    const [keywordPart, volumePart] = line.split('|').map(s => s.trim());
    if (!keywordPart) continue;

    const keywordStrs = keywordPart.split(',').map(k => k.trim()).filter(Boolean);
    const volumeStrs = volumePart
      ? volumePart.split(',').map(v => v.trim()).filter(Boolean)
      : [];

    const keywords = keywordStrs.map((kw, i) => ({
      kw,
      volume: volumeStrs[i] ? parseInt(volumeStrs[i], 10) || 0 : 0,
    }));

    if (keywords.length > 0) {
      groups.push({ keywords });
    }
  }

  return groups;
}

const BulkGenerationModal: React.FC<BulkGenerationModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  selectedBriefIds,
  clientId,
  onBatchCreated,
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Keywords tab state
  const [keywordText, setKeywordText] = useState('');
  const [country, setCountry] = useState('United States');
  const [serpLanguage, setSerpLanguage] = useState('English');
  const [outputLanguage, setOutputLanguage] = useState('English');

  // Existing briefs tab state
  const [existingAction, setExistingAction] = useState<'full_brief' | 'article'>('full_brief');
  const [writerInstructions, setWriterInstructions] = useState('');

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Parse keyword input
  const parsedGroups = useMemo(() => parseKeywordInput(keywordText), [keywordText]);
  const totalKeywords = useMemo(
    () => parsedGroups.reduce((sum, g) => sum + g.keywords.length, 0),
    [parsedGroups]
  );

  // Determine brief count based on active tab
  const briefCount = activeTab === 'keywords' ? parsedGroups.length : selectedBriefIds.length;

  // Validation
  const isValid = useMemo(() => {
    if (activeTab === 'keywords') {
      return parsedGroups.length > 0;
    }
    return selectedBriefIds.length > 0;
  }, [activeTab, parsedGroups, selectedBriefIds]);

  // Tab items
  const tabItems = useMemo(() => [
    { id: 'keywords', label: 'From Keywords' },
    {
      id: 'existing',
      label: 'Existing Briefs',
      count: selectedBriefIds.length > 0 ? selectedBriefIds.length : undefined,
      disabled: selectedBriefIds.length === 0,
    },
  ], [selectedBriefIds.length]);

  // Handle batch creation
  const handleStart = useCallback(async () => {
    if (!isValid) return;
    setIsLoading(true);

    try {
      if (activeTab === 'keywords') {
        const result = await createGenerationBatch({
          clientId,
          generationType: 'full_pipeline',
          briefEntries: parsedGroups,
          country,
          serpLanguage,
          outputLanguage,
        });
        toast.success(`Batch started: ${result.totalJobs} jobs for ${parsedGroups.length} briefs`);
      } else {
        const result = await createGenerationBatch({
          clientId,
          generationType: existingAction,
          briefIds: selectedBriefIds,
          writerInstructions: existingAction === 'article' ? writerInstructions || undefined : undefined,
        });
        toast.success(`Batch started: ${result.totalJobs} jobs for ${selectedBriefIds.length} briefs`);
      }

      onBatchCreated();
      onClose();
      // Reset state
      setKeywordText('');
      setWriterInstructions('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create batch';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, isValid, clientId, parsedGroups, country, serpLanguage, outputLanguage, existingAction, selectedBriefIds, writerInstructions, onBatchCreated, onClose]);

  // Reset tab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const startLabel = isLoading
    ? 'Creating...'
    : activeTab === 'keywords'
      ? `Start Batch (${parsedGroups.length} brief${parsedGroups.length !== 1 ? 's' : ''})`
      : `Start Batch (${selectedBriefIds.length} brief${selectedBriefIds.length !== 1 ? 's' : ''})`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Generation"
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStart}
            disabled={!isValid || isLoading}
            loading={isLoading}
          >
            {startLabel}
          </Button>
        </>
      }
    >
      {/* Tab Selector */}
      <div className="mb-5">
        <Tabs
          items={tabItems}
          activeId={activeTab}
          onChange={setActiveTab}
          variant="pills"
          size="sm"
        />
      </div>

      {/* Keywords Tab */}
      {activeTab === 'keywords' && (
        <div className="space-y-5">
          {/* Keyword Input */}
          <Textarea
            label="Keywords"
            rows={8}
            value={keywordText}
            onChange={(e) => setKeywordText(e.target.value)}
            placeholder={`Enter one brief per line. Comma-separate multiple keywords.\nOptionally add volumes after a pipe (|).\n\nExamples:\nbest nas for home, nas storage | 1200, 800\nssd vs hdd, solid state drive | 2400, 900\nraid configuration guide | 1500`}
            hint="Each line creates one brief. Keywords within a line share that brief."
          />

          {/* Settings Row */}
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Country"
              size="sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={countries.map(c => ({ value: c, label: c }))}
            />
            <Select
              label="SERP Language"
              size="sm"
              value={serpLanguage}
              onChange={(e) => setSerpLanguage(e.target.value)}
              options={languages.map(l => ({ value: l, label: l }))}
            />
            <Select
              label="Output Language"
              size="sm"
              value={outputLanguage}
              onChange={(e) => setOutputLanguage(e.target.value)}
              options={languages.map(l => ({ value: l, label: l }))}
            />
          </div>

          {/* Preview */}
          {parsedGroups.length > 0 && (
            <Card variant="outline" padding="sm">
              <p className="text-sm text-muted-foreground">
                This will create{' '}
                <Badge variant="teal" size="sm">{parsedGroups.length}</Badge>{' '}
                brief{parsedGroups.length !== 1 ? 's' : ''} with a total of{' '}
                <Badge variant="teal" size="sm">{totalKeywords}</Badge>{' '}
                keyword{totalKeywords !== 1 ? 's' : ''}.
                Each brief will run competitor analysis followed by full 7-step brief generation.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Existing Briefs Tab */}
      {activeTab === 'existing' && (
        <div className="space-y-5">
          {/* Selected count */}
          <div className="flex items-center gap-2">
            <Badge variant="teal">{selectedBriefIds.length}</Badge>
            <span className="text-sm text-foreground">
              brief{selectedBriefIds.length !== 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Action Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Generation Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExistingAction('full_brief')}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all duration-200',
                  existingAction === 'full_brief'
                    ? 'border-primary bg-teal-50 ring-1 ring-primary'
                    : 'border-border hover:border-gray-300 bg-card'
                )}
              >
                <div className="font-heading font-semibold text-foreground text-sm mb-1">
                  Generate Full Brief
                </div>
                <p className="text-xs text-muted-foreground">
                  Run the full 7-step brief generation pipeline
                </p>
              </button>
              <button
                type="button"
                onClick={() => setExistingAction('article')}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all duration-200',
                  existingAction === 'article'
                    ? 'border-primary bg-teal-50 ring-1 ring-primary'
                    : 'border-border hover:border-gray-300 bg-card'
                )}
              >
                <div className="font-heading font-semibold text-foreground text-sm mb-1">
                  Generate Article
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate articles from completed briefs
                </p>
              </button>
            </div>
          </div>

          {/* Writer instructions for articles */}
          {existingAction === 'article' && (
            <Textarea
              label="Writer Instructions (optional)"
              rows={3}
              value={writerInstructions}
              onChange={(e) => setWriterInstructions(e.target.value)}
              placeholder="Add any specific instructions for the article writer..."
            />
          )}

          {/* Warnings */}
          {selectedBriefIds.length > 0 && existingAction === 'article' && (
            <Alert variant="info">
              Articles will only be generated for briefs that have completed brief data.
              Incomplete briefs will be skipped.
            </Alert>
          )}
        </div>
      )}
    </Modal>
  );
};

export default BulkGenerationModal;
