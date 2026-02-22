import React, { useState } from 'react';
import { Input, Textarea } from '../../ui';

interface ContentStrategySectionProps {
  data: {
    content_dos?: string[];
    content_donts?: string[];
    banned_terms?: string[];
    preferred_terms?: string[];
    seo_guidelines?: string;
    known_competitors?: string[];
  };
  onChange: (data: ContentStrategySectionProps['data']) => void;
}

const ListInput: React.FC<{
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  tagColor: string;
}> = ({ items, onChange, placeholder, tagColor }) => {
  const [input, setInput] = useState('');

  const colorMap: Record<string, { bg: string; text: string; border: string; hover: string }> = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', hover: 'hover:text-teal-700' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', hover: 'hover:text-red-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', hover: 'hover:text-blue-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', hover: 'hover:text-amber-700' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', hover: 'hover:text-gray-700' },
  };

  const colors = colorMap[tagColor] || colorMap.gray;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 ${colors.bg} ${colors.text} text-sm rounded-md border ${colors.border}`}>
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className={`${colors.text} opacity-50 ${colors.hover} hover:opacity-100`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            if (!items.includes(input.trim())) {
              onChange([...items, input.trim()]);
            }
            setInput('');
          }
        }}
        placeholder={placeholder}
        size="sm"
      />
    </div>
  );
};

const ContentStrategySection: React.FC<ContentStrategySectionProps> = ({ data, onChange }) => {
  const update = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading font-semibold text-foreground mb-1">Content Strategy</h2>
        <p className="text-sm text-muted-foreground">Content guidelines, terms, and competitor awareness</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Content Do's</label>
          <p className="text-xs text-muted-foreground mb-2">Things to always include or follow</p>
          <ListInput
            items={data.content_dos || []}
            onChange={(items) => update('content_dos', items)}
            placeholder="e.g., Include data/statistics..."
            tagColor="teal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Content Don'ts</label>
          <p className="text-xs text-muted-foreground mb-2">Things to always avoid</p>
          <ListInput
            items={data.content_donts || []}
            onChange={(items) => update('content_donts', items)}
            placeholder="e.g., Don't use jargon..."
            tagColor="red"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Preferred Terms</label>
          <ListInput
            items={data.preferred_terms || []}
            onChange={(items) => update('preferred_terms', items)}
            placeholder="e.g., solution, platform..."
            tagColor="blue"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Banned Terms</label>
          <ListInput
            items={data.banned_terms || []}
            onChange={(items) => update('banned_terms', items)}
            placeholder="e.g., cheap, cutting-edge..."
            tagColor="amber"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">SEO Guidelines</label>
        <Textarea
          value={data.seo_guidelines || ''}
          onChange={(e) => update('seo_guidelines', e.target.value)}
          placeholder="General SEO direction, link building preferences, keyword density targets..."
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Known Competitors</label>
        <p className="text-xs text-muted-foreground mb-2">URLs of competitor websites (flagged during SERP analysis)</p>
        <ListInput
          items={data.known_competitors || []}
          onChange={(items) => update('known_competitors', items)}
          placeholder="e.g., https://competitor.com"
          tagColor="gray"
        />
      </div>
    </div>
  );
};

export default ContentStrategySection;
