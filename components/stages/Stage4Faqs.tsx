import React from 'react';
import type { ContentBrief } from '../../types';
import { LightbulbIcon, HelpCircleIcon } from '../Icon';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const ReasoningDisplay: React.FC<{ reasoning?: string }> = ({ reasoning }) => {
  if (!reasoning) return null;
  return (
    <div className="mb-4 p-3 bg-gray-50/70 border-l-4 border-teal-500 rounded-r-md">
      <div className="flex items-center">
        <LightbulbIcon className="h-4 w-4 mr-2 text-teal-600 flex-shrink-0" />
        <p className="text-xs font-semibold text-teal-600">AI Reasoning</p>
      </div>
      <p className="text-sm text-gray-400 italic pt-1 pl-6">{reasoning}</p>
    </div>
  );
};

const Stage5Faqs: React.FC<StageProps> = ({ briefData, setBriefData }) => {
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

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center mb-2">
          <HelpCircleIcon className="h-6 w-6 mr-2 text-teal-600" />
          <h2 className="text-lg font-semibold text-gray-800">Frequently Asked Questions</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">A list of relevant questions and guidelines on how to answer them.</p>
        
        <ReasoningDisplay reasoning={faqsData.reasoning} />

        <div className="space-y-4">
          {faqsData.questions.map((item, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <label htmlFor={`faq-q-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Question {index + 1}</label>
              <input
                type="text"
                id={`faq-q-${index}`}
                className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md text-gray-700 focus:ring-2 focus:ring-cyan-500"
                value={item.question}
                onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
              />
              <label htmlFor={`faq-g-${index}`} className="block text-sm font-medium text-gray-700 mt-2 mb-1">Guidelines</label>
              <textarea
                id={`faq-g-${index}`}
                rows={3}
                className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md text-gray-700 focus:ring-2 focus:ring-cyan-500"
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

export default Stage5Faqs;