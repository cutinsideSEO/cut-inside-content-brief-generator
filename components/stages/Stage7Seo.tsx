import React from 'react';
import type { ContentBrief } from '../../types';
import { Badge, Textarea, Input, AIReasoningIcon } from '../ui';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

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

  const getCharCountStatus = (count: number, max: number): { variant: 'success' | 'warning' | 'error'; label: string } => {
    if (count > max) return { variant: 'error', label: `${count}/${max}` };
    if (count > max * 0.9) return { variant: 'warning', label: `${count}/${max}` };
    return { variant: 'success', label: `${count}/${max}` };
  };

  const SeoField: React.FC<{
    id: string;
    label: string;
    value: string;
    reasoning?: string;
    maxLength?: number;
    multiline?: boolean;
    onChange: (value: string) => void;
    placeholder?: string;
  }> = ({ id, label, value, reasoning, maxLength, multiline, onChange, placeholder }) => {
    const charStatus = maxLength ? getCharCountStatus(value.length, maxLength) : null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor={id} className="text-sm font-heading font-semibold text-text-primary">
            {label}
          </label>
          {charStatus && (
            <Badge variant={charStatus.variant} size="sm">
              {charStatus.label}
            </Badge>
          )}
          {reasoning && <AIReasoningIcon reasoning={reasoning} />}
        </div>

        {multiline ? (
          <Textarea
            id={id}
            rows={2}
            autoResize
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            placeholder={placeholder}
          />
        ) : (
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Core SEO */}
      <div>
        <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider mb-4">Core SEO</h3>
        <div className="space-y-5">
          <SeoField
            id="title_tag"
            label="Title Tag"
            value={seoData.title_tag.value}
            reasoning={seoData.title_tag.reasoning}
            maxLength={60}
            onChange={(value) => handleChange('title_tag', value)}
            placeholder="Enter title tag (max 60 characters)..."
          />

          <SeoField
            id="meta_description"
            label="Meta Description"
            value={seoData.meta_description.value}
            reasoning={seoData.meta_description.reasoning}
            maxLength={160}
            multiline
            onChange={(value) => handleChange('meta_description', value)}
            placeholder="Enter meta description (max 160 characters)..."
          />

          <SeoField
            id="h1"
            label="H1"
            value={seoData.h1.value}
            reasoning={seoData.h1.reasoning}
            onChange={(value) => handleChange('h1', value)}
            placeholder="Enter H1 heading..."
          />

          <SeoField
            id="url_slug"
            label="URL Slug"
            value={seoData.url_slug.value}
            reasoning={seoData.url_slug.reasoning}
            onChange={(value) => handleChange('url_slug', value)}
            placeholder="enter-url-slug"
          />
        </div>
      </div>

      {/* Social Media */}
      <div className="border-t border-border-subtle pt-6">
        <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider mb-4">Social Media (Open Graph)</h3>
        <div className="space-y-5">
          <SeoField
            id="og_title"
            label="OG Title"
            value={seoData.og_title.value}
            reasoning={seoData.og_title.reasoning}
            maxLength={70}
            onChange={(value) => handleChange('og_title', value)}
            placeholder="Enter OG title for social sharing..."
          />

          <SeoField
            id="og_description"
            label="OG Description"
            value={seoData.og_description.value}
            reasoning={seoData.og_description.reasoning}
            maxLength={200}
            multiline
            onChange={(value) => handleChange('og_description', value)}
            placeholder="Enter OG description for social sharing..."
          />
        </div>
      </div>
    </div>
  );
};

export default Stage7Seo;
