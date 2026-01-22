import React, { useState, useEffect } from 'react';
import type { ContentBrief, CompetitorPage } from '../../types';
import { exportBriefToMarkdown } from '../../services/markdownService';
import { CopyIcon, CheckIcon } from '../Icon';
import Button from '../Button';

interface StageProps {
  briefData: Partial<ContentBrief>;
  onRestart: () => void;
  competitorData: CompetitorPage[];
  keywordVolumeMap: Map<string, number>;
}

const Stage7Final: React.FC<StageProps> = ({ briefData, onRestart, competitorData, keywordVolumeMap }) => {
  const [copied, setCopied] = useState(false);
  const finalBriefJson = JSON.stringify(briefData, null, 2);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = () => {
    if (finalBriefJson) {
      navigator.clipboard.writeText(finalBriefJson);
      setCopied(true);
    }
  };

  const handleExport = () => {
    exportBriefToMarkdown(briefData, competitorData, keywordVolumeMap);
  };

  return (
    <div className="flex flex-col h-full">
        <h2 className="text-xl font-bold text-green-400 mb-2">Brief Generation Complete!</h2>
        <p className="text-gray-400 mb-4">Here is your final, comprehensive content brief. You can copy it as JSON or export it as a formatted Markdown file.</p>
        <div className="relative flex-grow min-h-0">
           <button 
              onClick={handleCopy}
              className="absolute top-3 right-3 p-2 bg-gray-700/80 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500"
              aria-label="Copy to clipboard"
            >
              {copied ? <CheckIcon className="h-5 w-5 text-green-400"/> : <CopyIcon className="h-5 w-5"/>}
            </button>
          <pre className="w-full h-full p-4 bg-gray-900 border border-gray-700 rounded-md overflow-auto">
            <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{finalBriefJson}</code>
          </pre>
        </div>
        <div className="mt-4 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <Button onClick={handleExport} variant="primary" className="w-full md:w-1/2">
                Export as Markdown
            </Button>
            <Button onClick={onRestart} variant="secondary" className="w-full md:w-1/2">
                Start a New Brief
            </Button>
        </div>
    </div>
  );
};

export default Stage7Final;