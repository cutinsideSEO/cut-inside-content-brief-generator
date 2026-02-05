import React from 'react';
import type { ContentBrief, OutlineItem } from '../../types';
import { ListTreeIcon, LightbulbIcon } from '../Icon';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const ReasoningDisplay: React.FC<{ reasoning?: string; isNested?: boolean }> = ({ reasoning, isNested }) => {
  if (!reasoning) return null;
  const marginClass = isNested ? "mt-2" : "mb-4";
  return (
    <div className={`${marginClass} p-3 bg-gray-50/70 border-l-4 border-teal-500 rounded-r-md`}>
      <div className="flex items-center">
        <LightbulbIcon className="h-4 w-4 mr-2 text-teal-600 flex-shrink-0" />
        <p className="text-xs font-semibold text-teal-600">AI Reasoning</p>
      </div>
      <p className="text-sm text-gray-400 italic pt-1 pl-6">{reasoning}</p>
    </div>
  );
};

const OutlineNode: React.FC<{
  item: OutlineItem;
  path: number[];
  onUpdate: (path: number[], field: keyof OutlineItem, value: any) => void;
}> = ({ item, path, onUpdate }) => {

  const handleInputChange = (field: keyof OutlineItem, value: any) => {
    onUpdate(path, field, value);
  };
  
  const levelPadding = (path.length - 1) * 2;

  return (
    <div 
      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
      style={{ marginLeft: `${levelPadding}rem` }}
    >
      <div className="flex items-center justify-between mb-2">
         <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-gray-100 px-2 py-1 rounded-md">{item.level}</span>
      </div>
      
      <label className="block text-xs font-medium text-gray-400 mt-3 mb-1">Heading</label>
      <input
        type="text"
        className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md text-gray-800 font-semibold focus:ring-2 focus:ring-cyan-500"
        value={item.heading}
        onChange={(e) => handleInputChange('heading', e.target.value)}
      />
      <label className="block text-xs font-medium text-gray-400 mt-3 mb-1">Guidelines</label>
      <textarea
        rows={3}
        className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md text-gray-700 text-sm focus:ring-2 focus:ring-cyan-500"
        value={item.guidelines.join('\n')}
        onChange={(e) => handleInputChange('guidelines', e.target.value.split('\n'))}
        placeholder="Enter guidelines, one per line."
      />
       <ReasoningDisplay reasoning={item.reasoning} isNested={true} />

      {item.children?.map((child, index) => (
        <div className="mt-4" key={index}>
            <OutlineNode 
                item={child}
                path={[...path, index]}
                onUpdate={onUpdate}
            />
        </div>
      ))}
    </div>
  );
};


const Stage4Structure: React.FC<StageProps> = ({ briefData, setBriefData }) => {
  const structure = briefData.article_structure || { word_count_target: 0, outline: [], reasoning: '' };

  const handleWordCountChange = (value: string) => {
    const count = parseInt(value, 10);
    setBriefData(prev => ({
      ...prev,
      article_structure: {
        // @ts-ignore
        ...prev.article_structure,
        word_count_target: isNaN(count) ? 0 : count,
      }
    }));
  };

  const handleOutlineChange = (path: number[], field: keyof OutlineItem, value: any) => {
    setBriefData(prev => {
        const newBriefData = JSON.parse(JSON.stringify(prev)); // Deep copy for mutation
        
        let currentLevel = newBriefData.article_structure.outline;
        for (let i = 0; i < path.length - 1; i++) {
            currentLevel = currentLevel[path[i]].children;
        }
        
        const nodeToUpdate = currentLevel[path[path.length - 1]];
        if (nodeToUpdate) {
            // @ts-ignore
            nodeToUpdate[field] = value;
        }
        
        return newBriefData;
    });
  };

  return (
    <div className="space-y-6">
       <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
         <div className="flex items-center mb-2">
            <ListTreeIcon className="h-6 w-6 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-800">Article Structure</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">Set a target word count and define the content outline.</p>
        
        <ReasoningDisplay reasoning={structure.reasoning} />

        <div>
          <label htmlFor="word_count" className="block text-sm font-medium text-gray-700 mb-1">Word Count Target</label>
          <input
            type="number"
            id="word_count"
            className="w-1/2 p-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700 focus:ring-2 focus:ring-cyan-500"
            value={structure.word_count_target || ''}
            onChange={(e) => handleWordCountChange(e.target.value)}
          />
        </div>
        
        <div className="mt-6">
          <h3 className="text-md font-medium text-gray-700 mb-2">Content Outline</h3>
          <div className="space-y-4">
            {structure.outline?.map((item, index) => (
              <OutlineNode
                key={index}
                item={item}
                path={[index]}
                onUpdate={handleOutlineChange}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stage4Structure;