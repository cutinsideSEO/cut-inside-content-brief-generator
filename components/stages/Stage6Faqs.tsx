import React from 'react';
import type { ContentBrief } from '../../types';
import { XIcon } from '../Icon';
import { Input, AIReasoningIcon, EditableText } from '../ui';
import Button from '../Button';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const Stage6Faqs: React.FC<StageProps> = ({ briefData, setBriefData }) => {
  const faqsData = briefData.faqs || { questions: [], reasoning: '' };

  const handleFaqChange = (index: number, field: 'question' | 'guidelines', value: string) => {
    setBriefData(prev => {
      const newFaqs = { ...(prev.faqs || faqsData) };
      const newQuestions = [...newFaqs.questions];

      const currentItem = newQuestions[index] || { question: '', guidelines: [] };

      if (field === 'question') {
          newQuestions[index] = { ...currentItem, question: value };
      } else if (field === 'guidelines') {
          newQuestions[index] = { ...currentItem, guidelines: value.split('\n') };
      }

      return { ...prev, faqs: { ...newFaqs, questions: newQuestions } };
    });
  };

  const handleRemoveFaq = (indexToRemove: number) => {
    setBriefData(prev => {
      const currentFaqs = prev.faqs;
      if (!currentFaqs) return prev;

      const newQuestions = currentFaqs.questions.filter((_, index) => index !== indexToRemove);

      return {
          ...prev,
          faqs: { ...currentFaqs, questions: newQuestions }
      };
    });
  };

  return (
    <div className="space-y-4">
      {faqsData.reasoning && (
        <div className="flex items-center gap-2 mb-2">
          <AIReasoningIcon reasoning={faqsData.reasoning} />
          <span className="text-xs text-text-muted">AI-generated questions based on PAA data and competitor analysis</span>
        </div>
      )}

      <div className="space-y-1">
        {faqsData.questions.map((item, index) => (
          <div key={index} className="group border-b border-border-subtle last:border-b-0 py-3">
            <div className="flex items-start gap-3">
              <span className="text-sm font-heading font-bold text-text-muted mt-0.5 w-6 text-right flex-shrink-0">
                {index + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <Input
                  value={item.question}
                  onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                  placeholder="Enter the FAQ question..."
                  className="font-medium"
                />
                <div className="mt-2">
                  <EditableText
                    value={item.guidelines?.join('\n') || ''}
                    onChange={(val) => handleFaqChange(index, 'guidelines', val)}
                    placeholder="Guidelines for answering this question..."
                    textClassName="text-text-secondary text-xs"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFaq(index)}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-status-error transition-opacity flex-shrink-0"
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {faqsData.questions.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          <p>No FAQs generated yet.</p>
        </div>
      )}
    </div>
  );
};

export default Stage6Faqs;
