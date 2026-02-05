import React from 'react';
import Button from './Button';
import { RefreshCwIcon, AlertTriangleIcon } from './Icon';

interface BriefCardProps {
  title: string;
  icon: React.ReactNode;
  isStale?: boolean;
  onRegenerate: () => void;
  isLoading: boolean;
  children: React.ReactNode;
  feedback: string;
  onFeedbackChange: (value: string) => void;
}

const BriefCard: React.FC<BriefCardProps> = ({ title, icon, isStale, onRegenerate, isLoading, children, feedback, onFeedbackChange }) => {
  return (
    <div className={`bg-black/50 rounded-lg shadow-lg border ${isStale ? 'border-yellow/50' : 'border-white/10'}`}>
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {icon}
          <h2 className="text-lg font-heading font-semibold text-gray-600">{title}</h2>
        </div>
        {isStale && (
            <div className="flex items-center space-x-2 text-amber-500 text-xs font-heading font-semibold bg-amber-400/10 px-2 py-1 rounded-md">
                <AlertTriangleIcon className="h-4 w-4" />
                <span>Stale - Regenerate Recommended</span>
            </div>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
      <div className="p-4 border-t border-white/10 bg-black/30 rounded-b-lg">
         <h3 className="text-sm font-heading font-semibold text-gray-600/80 mb-2">Feedback / Notes for Regeneration</h3>
          <textarea 
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              placeholder={`e.g., 'Make the tone more technical' or 'Focus on enterprise customers'`}
              className="w-full p-2 bg-background border border-white/20 rounded-md text-sm h-20 resize-none focus:ring-1 focus:ring-teal text-gray-600"
              disabled={isLoading}
          />
           <div className="mt-3">
              <Button onClick={onRegenerate} disabled={isLoading} variant="secondary" size="sm" className="w-auto">
                 {isLoading ? (
                     <>
                        <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin"/>
                        Regenerating...
                     </>
                 ) : (
                    <>
                        <RefreshCwIcon className="h-4 w-4 mr-2"/>
                        Regenerate {title}
                    </>
                 )}
              </Button>
          </div>
      </div>
    </div>
  );
};

export default BriefCard;