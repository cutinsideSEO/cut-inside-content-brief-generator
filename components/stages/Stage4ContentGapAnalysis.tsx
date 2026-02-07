import React from 'react';
import type { ContentBrief, ReasoningItem } from '../../types';
import { XIcon } from '../Icon';
import {
  AIReasoningIcon,
  EditableText,
  Badge,
  Separator,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../ui';
import Button from '../Button';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const Stage4ContentGapAnalysis: React.FC<StageProps> = ({ briefData, setBriefData }) => {
  const gapData = briefData.content_gap_analysis || {
    table_stakes: [],
    strategic_opportunities: [],
    reasoning: '',
  };

  const handleItemChange = (index: number, type: 'table_stakes' | 'strategic_opportunities', value: string) => {
    setBriefData(prev => {
      const newGapData = { ...(prev.content_gap_analysis || gapData) };
      const newItems = [...newGapData[type]];
      newItems[index] = { ...newItems[index], value };
      return { ...prev, content_gap_analysis: { ...newGapData, [type]: newItems } };
    });
  };

  const handleAddItem = (type: 'table_stakes' | 'strategic_opportunities') => {
    setBriefData(prev => {
      const currentGapData = prev.content_gap_analysis || gapData;
      const newItems = [...currentGapData[type], { value: '', reasoning: '' }];
      return {
        ...prev,
        content_gap_analysis: {
          ...currentGapData,
          [type]: newItems,
        },
      };
    });
  };

  const handleRemoveItem = (type: 'table_stakes' | 'strategic_opportunities', indexToRemove: number) => {
    setBriefData(prev => {
        const currentGapData = prev.content_gap_analysis;
        if (!currentGapData) return prev;

        const newItems = [...currentGapData[type]].filter((_, index) => index !== indexToRemove);

        return {
            ...prev,
            content_gap_analysis: {
                ...currentGapData,
                [type]: newItems
            }
        };
    });
  };

  const renderGapTable = (
    items: ReasoningItem<string>[],
    type: 'table_stakes' | 'strategic_opportunities',
    placeholder: string,
    emptyMessage: string
  ) => (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">#</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead className="w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <TableRow key={index} className="group">
                <TableCell className="text-muted-foreground text-xs font-medium">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <EditableText
                    value={item.value}
                    onChange={(val) => handleItemChange(index, type, val)}
                    placeholder={placeholder}
                  />
                </TableCell>
                <TableCell>
                  {item.reasoning && <AIReasoningIcon reasoning={item.reasoning} />}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(type, index)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground italic py-6">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleAddItem(type)}
        className={`mt-3 ${type === 'table_stakes' ? 'text-teal hover:text-teal' : 'text-amber-500 hover:text-amber-600'}`}
        icon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      >
        Add Item
      </Button>
    </>
  );

  return (
    <div className="space-y-8">
      {gapData.reasoning && (
        <div className="flex items-center gap-2">
          <AIReasoningIcon reasoning={gapData.reasoning} />
          <span className="text-xs text-muted-foreground">AI analysis of content gaps based on competitor coverage</span>
        </div>
      )}

      {/* Table Stakes */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="teal" size="sm">Table Stakes</Badge>
          <span className="text-xs text-muted-foreground">Must-Have Topics</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Topics that all top competitors cover — essential for credibility
        </p>
        {renderGapTable(
          gapData.table_stakes,
          'table_stakes',
          'Essential topic to cover...',
          'No table stakes identified yet'
        )}
      </div>

      <Separator />

      {/* Strategic Opportunities */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="warning" size="sm">Strategic Opportunities</Badge>
          <span className="text-xs text-muted-foreground">Content Gaps</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Topics competitors miss — your chance to differentiate
        </p>
        {renderGapTable(
          gapData.strategic_opportunities,
          'strategic_opportunities',
          'Strategic opportunity to explore...',
          'No opportunities identified yet'
        )}
      </div>
    </div>
  );
};

export default Stage4ContentGapAnalysis;
