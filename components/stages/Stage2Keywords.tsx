import React, { useState } from 'react';
import type { ContentBrief, KeywordSelection } from '../../types';
import { XIcon, ChevronDownIcon } from '../Icon';
import { Badge, Textarea, AIReasoningIcon, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui';
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
      <Collapsible key={rowKey} open={isExpanded} onOpenChange={() => toggleRow(rowKey)} asChild>
        <>
          <CollapsibleTrigger asChild>
            <TableRow className={`cursor-pointer ${isExpanded ? 'bg-gray-100' : ''}`}>
              <TableCell className="p-3">
                <Badge variant={isPrimary ? 'teal' : 'default'} size="sm">
                  {type}
                </Badge>
              </TableCell>
              <TableCell className="p-3 font-medium text-gray-900">{kwSelection.keyword}</TableCell>
              <TableCell className="p-3 font-mono text-gray-600 text-sm">{getVolume(kwSelection.keyword)}</TableCell>
              <TableCell className="p-3 text-sm text-gray-400 truncate max-w-[200px]">
                {notePreview || <span className="italic">No notes</span>}
              </TableCell>
              <TableCell className="p-3 text-center">
                <div className="flex items-center gap-1">
                  <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveKeyword(type.toLowerCase() as 'primary' | 'secondary', index);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </CollapsibleTrigger>
          <CollapsibleContent asChild>
            <TableRow className="bg-gray-100">
              <TableCell colSpan={5} className="p-4">
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
              </TableCell>
            </TableRow>
          </CollapsibleContent>
        </>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4">
      {strategy.reasoning && (
        <div className="flex items-center gap-2 mb-2">
          <AIReasoningIcon reasoning={strategy.reasoning} />
          <span className="text-xs text-gray-400">AI has categorized your keywords with strategic notes</span>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="p-3 text-xs font-heading font-semibold text-gray-600 uppercase tracking-wider w-[15%]">Type</TableHead>
            <TableHead className="p-3 text-xs font-heading font-semibold text-gray-600 uppercase tracking-wider w-[25%]">Keyword</TableHead>
            <TableHead className="p-3 text-xs font-heading font-semibold text-gray-600 uppercase tracking-wider w-[15%]">Volume</TableHead>
            <TableHead className="p-3 text-xs font-heading font-semibold text-gray-600 uppercase tracking-wider w-[35%]">Notes</TableHead>
            <TableHead className="p-3 text-xs font-heading font-semibold text-gray-600 uppercase tracking-wider w-[10%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {strategy.primary_keywords?.map((kw, index) => (
            renderKeywordRow(kw, 'Primary', index)
          ))}
          {strategy.secondary_keywords?.map((kw, index) => (
            renderKeywordRow(kw, 'Secondary', index)
          ))}
        </TableBody>
      </Table>

      {strategy.primary_keywords?.length === 0 && strategy.secondary_keywords?.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No keywords have been categorized yet.</p>
        </div>
      )}
    </div>
  );
};

export default Stage2Keywords;
