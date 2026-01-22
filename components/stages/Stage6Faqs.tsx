import React from 'react';
import type { ContentBrief } from '../../types';
import { LightbulbIcon, HelpCircleIcon, XIcon } from '../Icon';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const ReasoningDisplay: React.FC<{ reasoning?: string }> = ({ reasoning }) => {
  if (!reasoning) return null;
  return (
    <div className="mb-4 p-3 bg-black/50 border-l-4 border-teal rounded-r-md">
      <div className="flex items-center">
        <LightbulbIcon className="h-4 w-4 mr-2 text-teal flex-shrink-0" />
        <p className="text-xs font-heading font-semibold text-teal">AI Reasoning</p>
      </div>
      <p className="text-sm text-grey/70 italic pt-1 pl-6">{reasoning}</p>
    </div>
  );
};

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
      <div className="p-4 bg-black/20 rounded-lg border border-white/10">
        <div className="flex items-center mb-2">
          <HelpCircleIcon className="h-6 w-6 mr-2 text-teal" />
          <h2 className="text-lg font-heading font-semibold text-grey">Frequently Asked Questions</h2>
        </div>
        <p className="text-sm text-grey/60 mb-4">A list of relevant questions and guidelines on how to answer them.</p>
        
        <ReasoningDisplay reasoning={faqsData.reasoning} />

        <div className="space-y-4">
          {faqsData.questions.map((item, index) => (
            <div key={index} className="p-3 bg-black/30 rounded-md border border-white/10 relative">
              <button 
                  onClick={() => handleRemoveFaq(index)} 
                  className="absolute top-2 right-2 p-1 text-grey/50 hover:text-red-500 rounded-full hover:bg-white/10"
                  title="Remove FAQ"
              >
                  <XIcon className="h-4 w-4" />
              </button>
              <label htmlFor={`faq-q-${index}`} className="block text-sm font-heading font-medium text-teal mb-1">Question {index + 1}</label>
              <input
                type="text"
                id={`faq-q-${index}`}
                className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
                value={item.question}
                onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
              />
              <label htmlFor={`faq-g-${index}`} className="block text-sm font-heading font-medium text-teal mt-2 mb-1">Guidelines</label>
              <textarea
                id={`faq-g-${index}`}
                rows={3}
                className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
                value={item.guidelines?.join('\n') || ''}
                onChange={(e) => handleFaqChange(index, 'guidelines', e.target.value)}
                placeholder="Enter guidelines, one per line..."
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stage6Faqs;