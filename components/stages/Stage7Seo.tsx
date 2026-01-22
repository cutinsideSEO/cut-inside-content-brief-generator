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
    <div className="mt-2 p-3 bg-black/50 border-l-4 border-teal rounded-r-md">
      <div className="flex items-center">
        <LightbulbIcon className="h-4 w-4 mr-2 text-teal flex-shrink-0" />
        <p className="text-xs font-heading font-semibold text-teal">AI Reasoning</p>
      </div>
      <p className="text-sm text-grey/70 italic pt-1 pl-6">{reasoning}</p>
    </div>
  );
};

const Stage7Seo: React.FC<StageProps> = ({ briefData, setBriefData }) => {
  const defaultSeo = { 
    title_tag: { value: '', reasoning: '' }, 
    meta_description: { value: '', reasoning: '' }, 
    h1: { value: '', reasoning: '' }, 
    url_slug: { value: '', reasoning: '' },
    og_title: { value: '', reasoning: '' },
    og_description: { value: '', reasoning: '' }
  };

  const seoData = {
    title_tag: { ...defaultSeo.title_tag, ...briefData.on_page_seo?.title_tag },
    meta_description: { ...defaultSeo.meta_description, ...briefData.on_page_seo?.meta_description },
    h1: { ...defaultSeo.h1, ...briefData.on_page_seo?.h1 },
    url_slug: { ...defaultSeo.url_slug, ...briefData.on_page_seo?.url_slug },
    og_title: { ...defaultSeo.og_title, ...briefData.on_page_seo?.og_title },
    og_description: { ...defaultSeo.og_description, ...briefData.on_page_seo?.og_description },
  };
  
  const handleChange = (field: keyof NonNullable<ContentBrief['on_page_seo']>, value: string) => {
    setBriefData(prev => {
        const currentSeo = prev.on_page_seo || {};
        return {
            ...prev,
            on_page_seo: {
                ...defaultSeo,
                ...currentSeo,
                [field]: {
                    ...(currentSeo[field] || defaultSeo[field]),
                    value: value,
                },
            },
        };
    });
  };

  const getCharCountClass = (count: number, max: number) => {
    if (count > max) return 'text-red-400';
    if (count > max * 0.9) return 'text-yellow';
    return 'text-grey/50';
  };

  return (
    <div className="space-y-6">
       <div className="p-4 bg-black/20 rounded-lg border border-white/10">
         <div className="flex items-center mb-2">
            <FileCodeIcon className="h-6 w-6 mr-2 text-teal" />
            <h2 className="text-lg font-heading font-semibold text-grey">On-Page SEO Elements</h2>
        </div>
        <p className="text-sm text-grey/60 mb-4">Craft the final SEO elements for the page.</p>
        <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="title_tag" className="block text-sm font-heading font-medium text-teal">Title Tag</label>
                <span className={`text-xs ${getCharCountClass(seoData.title_tag.value.length, 60)}`}>{seoData.title_tag.value.length} / 60</span>
              </div>
              <input type="text" id="title_tag" className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
                value={seoData.title_tag.value}
                onChange={(e) => handleChange('title_tag', e.target.value)}
              />
              <ReasoningDisplay reasoning={seoData.title_tag.reasoning} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="meta_description" className="block text-sm font-heading font-medium text-teal">Meta Description</label>
                <span className={`text-xs ${getCharCountClass(seoData.meta_description.value.length, 160)}`}>{seoData.meta_description.value.length} / 160</span>
              </div>
              <textarea id="meta_description" rows={3} className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
                value={seoData.meta_description.value}
                onChange={(e) => handleChange('meta_description', e.target.value)}
              />
              <ReasoningDisplay reasoning={seoData.meta_description.reasoning} />
            </div>
            <div>
              <label htmlFor="h1" className="block text-sm font-heading font-medium text-teal mb-1">H1</label>
              <input type="text" id="h1" className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
                value={seoData.h1.value}
                onChange={(e) => handleChange('h1', e.target.value)}
              />
              <ReasoningDisplay reasoning={seoData.h1.reasoning} />
            </div>
            <div>
              <label htmlFor="url_slug" className="block text-sm font-heading font-medium text-teal mb-1">URL Slug</label>
              <input type="text" id="url_slug" className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
                value={seoData.url_slug.value}
                onChange={(e) => handleChange('url_slug', e.target.value)}
              />
              <ReasoningDisplay reasoning={seoData.url_slug.reasoning} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="og_title" className="block text-sm font-heading font-medium text-teal">OG Title (for Social)</label>
                <span className={`text-xs ${getCharCountClass(seoData.og_title.value.length, 70)}`}>{seoData.og_title.value.length} / 70</span>
              </div>
              <input type="text" id="og_title" className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
                value={seoData.og_title.value}
                onChange={(e) => handleChange('og_title', e.target.value)}
              />
              <ReasoningDisplay reasoning={seoData.og_title.reasoning} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="og_description" className="block text-sm font-heading font-medium text-teal">OG Description (for Social)</label>
                <span className={`text-xs ${getCharCountClass(seoData.og_description.value.length, 200)}`}>{seoData.og_description.value.length} / 200</span>
              </div>
              <textarea id="og_description" rows={3} className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
                value={seoData.og_description.value}
                onChange={(e) => handleChange('og_description', e.target.value)}
              />
              <ReasoningDisplay reasoning={seoData.og_description.reasoning} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Stage7Seo;
