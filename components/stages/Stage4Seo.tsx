import React from 'react';
import type { ContentBrief } from '../../types';
import { FileCodeIcon, LightbulbIcon } from '../Icon';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const ReasoningDisplay: React.FC<{ reasoning?: string }> = ({ reasoning }) => {
  if (!reasoning) return null;
  return (
    <div className="mt-2 p-3 bg-gray-50/70 border-l-4 border-teal-500 rounded-r-md">
      <div className="flex items-center">
        <LightbulbIcon className="h-4 w-4 mr-2 text-teal-600 flex-shrink-0" />
        <p className="text-xs font-semibold text-teal-600">AI Reasoning</p>
      </div>
      <p className="text-sm text-gray-400 italic pt-1 pl-6">{reasoning}</p>
    </div>
  );
};

const Stage6Seo: React.FC<StageProps> = ({ briefData, setBriefData }) => {
  // FIX: Initialize seoData with all properties from the OnPageSeo type to prevent type errors when updating state.
  const seoData = briefData.on_page_seo || { 
    title_tag: { value: '', reasoning: '' }, 
    meta_description: { value: '', reasoning: '' }, 
    h1: { value: '', reasoning: '' }, 
    url_slug: { value: '', reasoning: '' },
    og_title: { value: '', reasoning: '' },
    og_description: { value: '', reasoning: '' }
  };
  
  const handleChange = (field: keyof NonNullable<ContentBrief['on_page_seo']>, value: string) => {
    setBriefData(prev => {
        const currentSeo = prev.on_page_seo || seoData;
        return {
            ...prev,
            on_page_seo: {
                ...currentSeo,
                [field]: {
                    ...currentSeo[field],
                    value: value,
                },
            },
        };
    });
  };

  const getCharCountClass = (count: number, max: number) => {
    if (count > max) return 'text-red-400';
    if (count > max * 0.9) return 'text-amber-500-400';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-6">
       <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
         <div className="flex items-center mb-2">
            <FileCodeIcon className="h-6 w-6 mr-2 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-800">On-Page SEO Elements</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">Craft the final SEO elements for the page.</p>
        <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="title_tag" className="block text-sm font-medium text-gray-700">Title Tag</label>
                <span className={`text-xs ${getCharCountClass(seoData.title_tag.value.length, 60)}`}>{seoData.title_tag.value.length} / 60</span>
              </div>
              <input type="text" id="title_tag" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700 focus:ring-2 focus:ring-cyan-500"
                value={seoData.title_tag.value}
                onChange={(e) => handleChange('title_tag', e.target.value)}
              />
              <ReasoningDisplay reasoning={seoData.title_tag.reasoning} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700">Meta Description</label>
                <span className={`text-xs ${getCharCountClass(seoData.meta_description.value.length, 160)}`}>{seoData.meta_description.value.length} / 160</span>
              </div>
              <textarea id="meta_description" rows={3} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700 focus:ring-2 focus:ring-cyan-500"
                value={seoData.meta_description.value}
                onChange={(e) => handleChange('meta_description', e.target.value)}
              />
              <ReasoningDisplay reasoning={seoData.meta_description.reasoning} />
            </div>
            <div>
              <label htmlFor="h1" className="block text-sm font-medium text-gray-700 mb-1">H1</label>
              <input type="text" id="h1" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700 focus:ring-2 focus:ring-cyan-500"
                value={seoData.h1.value}
                onChange={(e) => handleChange('h1', e.target.value)}
              />
              <ReasoningDisplay reasoning={seoData.h1.reasoning} />
            </div>
            <div>
              <label htmlFor="url_slug" className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <input type="text" id="url_slug" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700 focus:ring-2 focus:ring-cyan-500"
                value={seoData.url_slug.value}
                onChange={(e) => handleChange('url_slug', e.target.value)}
              />
              <ReasoningDisplay reasoning={seoData.url_slug.reasoning} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Stage6Seo;