import React, { useState } from 'react';
import type { ContentBrief, KeywordSelection } from '../../types';
import { KeyIcon, XIcon, ChevronDownIcon } from '../Icon';
import { Card, Badge, Callout, Textarea } from '../ui';
import Button from '../Button';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
  keywordVolumeMap: Map<string, number>;
}

const Stage2Keywords: React.FC<StageProps> = ({ briefData, setBriefData, keywordVolumeMap }) => {
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const strategy = briefData.keyword_strategy || {
    primary_keywords: [],
    secondary_keywords: [],
    reasoning: ''
  };

  const handlePrimaryNotesChange = (index: number, value: string) => {
    const newPrimary = [...strategy.primary_keywords];
    newPrimary[index] = { ...newPrimary[index], notes: value };
    setBriefData(prev => ({
      ...prev,
      keyword_strategy: { ...strategy, primary_keywords: newPrimary },
    }));
  };

  const handleSecondaryNotesChange = (index: number, value: string) => {
    const newSecondary = [...strategy.secondary_keywords];
    newSecondary[index] = { ...newSecondary[index], notes: value };
    setBriefData(prev => ({
      ...prev,
      keyword_strategy: { ...strategy, secondary_keywords: newSecondary },
    }));
  };

  const handleRemoveKeyword = (type: 'primary' | 'secondary', indexToRemove: number) => {
    setBriefData(prev => {
        const currentStrategy = prev.keyword_strategy;
        if (!currentStrategy) return prev;

        let newPrimary = [...currentStrategy.primary_keywords];
        let newSecondary = [...currentStrategy.secondary_keywords];

        if (type === 'primary') {
            newPrimary = newPrimary.filter((_, index) => index !== indexToRemove);
        } else {
            newSecondary = newSecondary.filter((_, index) => index !== indexToRemove);
        }

        return {
            ...prev,
            keyword_strategy: {
                ...currentStrategy,
                primary_keywords: newPrimary,
                secondary_keywords: newSecondary
            }
        };
    });
  };

  const getVolume = (kw: string) => {
    const volume = keywordVolumeMap.get(kw.toLowerCase());
    return volume ? volume.toLocaleString() : 'N/A';
  }

  const toggleRow = (rowKey: string) => {
    setExpandedRowKey(prev => prev === rowKey ? null : rowKey);
  };

  const renderKeywordRow = (kwSelection: KeywordSelection, type: 'Primary' | 'Secondary', index: number) => {
    const isPrimary = type === 'Primary';
    const rowKey = `${type}-${index}`;
    const isExpanded = expandedRowKey === rowKey;
    const notePreview = kwSelection.notes ? kwSelection.notes.substring(0, 60) + (kwSelection.notes.length > 60 ? '...' : '') : '';

    return (
      <React.Fragment key={rowKey}>
        <tr
          className={`border-b border-border-subtle hover:bg-surface-hover transition-colors cursor-pointer ${isExpanded ? 'bg-surface-hover' : ''}`}
          onClick={() => toggleRow(rowKey)}
        >
          <td className="p-3">
            <Badge variant={isPrimary ? 'teal' : 'default'} size="sm">
              {type}
            </Badge>
          </td>
          <td className="p-3 font-medium text-text-primary">{kwSelection.keyword}</td>
          <td className="p-3 font-mono text-text-secondary text-sm">{getVolume(kwSelection.keyword)}</td>
          <td className="p-3 text-sm text-text-muted truncate max-w-[200px]">
            {notePreview || <span className="italic">No notes</span>}
          </td>
          <td className="p-3 text-center">
            <div className="flex items-center gap-1">
              <ChevronDownIcon className={`h-4 w-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveKeyword(type.toLowerCase() as 'primary' | 'secondary', index);
                }}
                className="text-text-muted hover:text-status-error"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr className="border-b border-border-subtle bg-surface-hover">
            <td colSpan={5} className="p-4">
              <Textarea
                rows={3}
                value={kwSelection.notes}
                onChange={(e) => {
                  if (isPrimary) {
                    handlePrimaryNotesChange(index, e.target.value);
                  } else {
                    handleSecondaryNotesChange(index, e.target.value);
                  }
                }}
                placeholder="AI notes on keyword usage..."
              />
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      <Card variant="default" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
            <KeyIcon className="h-5 w-5 text-teal" />
          </div>
          <div>
            <h3 className="text-base font-heading font-semibold text-text-primary">Keyword Strategy</h3>
            <p className="text-sm text-text-muted">The AI has categorized your keyword list and provided strategic notes</p>
          </div>
        </div>

        {strategy.reasoning && (
          <Callout variant="ai" title="AI Reasoning" className="mb-6" collapsible defaultCollapsed>
            {strategy.reasoning}
          </Callout>
        )}

        <div className="overflow-x-auto rounded-radius-md border border-border">
          <table className="w-full text-left">
            <thead className="bg-surface-hover">
              <tr>
                <th className="p-3 text-xs font-heading font-semibold text-text-secondary uppercase tracking-wider w-[15%]">Type</th>
                <th className="p-3 text-xs font-heading font-semibold text-text-secondary uppercase tracking-wider w-[25%]">Keyword</th>
                <th className="p-3 text-xs font-heading font-semibold text-text-secondary uppercase tracking-wider w-[15%]">Volume</th>
                <th className="p-3 text-xs font-heading font-semibold text-text-secondary uppercase tracking-wider w-[35%]">Notes</th>
                <th className="p-3 text-xs font-heading font-semibold text-text-secondary uppercase tracking-wider w-[10%]"></th>
              </tr>
            </thead>
            <tbody>
              {strategy.primary_keywords?.map((kw, index) => (
                renderKeywordRow(kw, 'Primary', index)
              ))}
              {strategy.secondary_keywords?.map((kw, index) => (
                renderKeywordRow(kw, 'Secondary', index)
              ))}
            </tbody>
          </table>
        </div>

        {strategy.primary_keywords?.length === 0 && strategy.secondary_keywords?.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <p>No keywords have been categorized yet.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Stage2Keywords;
