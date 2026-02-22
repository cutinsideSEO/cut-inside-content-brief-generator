import React, { useState } from 'react';
import { Input, Select } from '../../ui';
import type { BrandVoice, ToneDescriptor, WritingStyle, TechnicalLevel } from '../../../types/clientProfile';
import { TONE_LABELS, WRITING_STYLE_LABELS, TECHNICAL_LEVEL_LABELS } from '../../../types/clientProfile';

interface BrandVoiceSectionProps {
  data: BrandVoice;
  onChange: (data: BrandVoice) => void;
}

const TagInput: React.FC<{
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}> = ({ tags, onChange, placeholder }) => {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput('');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-sm rounded-md border border-teal-100">
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter(t => t !== tag))}
              className="text-teal-400 hover:text-teal-700 ml-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
        placeholder={placeholder || 'Type and press Enter...'}
        size="sm"
      />
    </div>
  );
};

const BrandVoiceSection: React.FC<BrandVoiceSectionProps> = ({ data, onChange }) => {
  const update = (field: keyof BrandVoice, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const toggleTone = (tone: ToneDescriptor) => {
    const current = data.tone_descriptors || [];
    if (current.includes(tone)) {
      update('tone_descriptors', current.filter(t => t !== tone));
    } else {
      update('tone_descriptors', [...current, tone]);
    }
  };

  const writingStyleOptions = Object.entries(WRITING_STYLE_LABELS).map(([value, label]) => ({
    value, label,
  }));

  const technicalLevelOptions = Object.entries(TECHNICAL_LEVEL_LABELS).map(([value, label]) => ({
    value, label,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading font-semibold text-foreground mb-1">Brand Voice</h2>
        <p className="text-sm text-muted-foreground">How the brand communicates with its audience</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Tone Descriptors</label>
        <p className="text-xs text-muted-foreground mb-3">Select all that apply</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(TONE_LABELS) as [ToneDescriptor, string][]).map(([key, label]) => {
            const isSelected = data.tone_descriptors?.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleTone(key)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                  isSelected
                    ? 'bg-teal-50 border-teal-200 text-teal-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Writing Style</label>
          <Select
            value={data.writing_style || ''}
            onChange={(e) => update('writing_style', e.target.value || undefined)}
            options={[{ value: '', label: 'Select style...' }, ...writingStyleOptions]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Technical Level</label>
          <Select
            value={data.technical_level || ''}
            onChange={(e) => update('technical_level', e.target.value || undefined)}
            options={[{ value: '', label: 'Select level...' }, ...technicalLevelOptions]}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Brand Values</label>
        <TagInput
          tags={data.values || []}
          onChange={(tags) => update('values', tags)}
          placeholder="e.g., Innovation, Transparency..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Unique Selling Propositions (USPs)</label>
        <TagInput
          tags={data.usps || []}
          onChange={(tags) => update('usps', tags)}
          placeholder="e.g., Fastest delivery in market..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Personality Traits</label>
        <TagInput
          tags={data.personality_traits || []}
          onChange={(tags) => update('personality_traits', tags)}
          placeholder="e.g., Approachable, Expert..."
        />
      </div>
    </div>
  );
};

export default BrandVoiceSection;
