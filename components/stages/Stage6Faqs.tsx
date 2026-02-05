import React from 'react';
import type { ContentBrief } from '../../types';
import { HelpCircleIcon, XIcon } from '../Icon';
import { Card, Callout, Textarea, Input } from '../ui';
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
    <div className="space-y-6">
      <Card variant="default" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
            <HelpCircleIcon className="h-5 w-5 text-teal" />
          </div>
          <div>
            <h3 className="text-base font-heading font-semibold text-text-primary">Frequently Asked Questions</h3>
            <p className="text-sm text-text-muted">A list of relevant questions and guidelines on how to answer them</p>
          </div>
        </div>

        {faqsData.reasoning && (
          <Callout variant="ai" title="AI Reasoning" className="mb-6" collapsible defaultCollapsed>
            {faqsData.reasoning}
          </Callout>
        )}

        <div className="space-y-4">
          {faqsData.questions.map((item, index) => (
            <Card key={index} variant="outline" padding="md" className="relative">
              <div className="absolute top-3 right-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFaq(index)}
                  className="text-text-muted hover:text-status-error"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4 pr-8">
                <div>
                  <label
                    htmlFor={`faq-q-${index}`}
                    className="block text-xs font-heading font-medium text-teal uppercase tracking-wider mb-2"
                  >
                    Question {index + 1}
                  </label>
                  <Input
                    id={`faq-q-${index}`}
                    value={item.question}
                    onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                    placeholder="Enter the FAQ question..."
                  />
                </div>

                <div>
                  <label
                    htmlFor={`faq-g-${index}`}
                    className="block text-xs font-heading font-medium text-teal uppercase tracking-wider mb-2"
                  >
                    Guidelines
                  </label>
                  <Textarea
                    id={`faq-g-${index}`}
                    rows={3}
                    value={item.guidelines?.join('\n') || ''}
                    onChange={(e) => handleFaqChange(index, 'guidelines', e.target.value)}
                    placeholder="Enter guidelines, one per line..."
                    hint="Provide guidance on how to answer this question"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {faqsData.questions.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <p>No FAQs generated yet.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Stage6Faqs;
