import React from 'react';
import { Input, Textarea, Select } from '../../ui';
import type { BrandIdentity, IndustryVertical } from '../../../types/clientProfile';
import { INDUSTRY_LABELS } from '../../../types/clientProfile';
import { getClientLogoUrl } from '../../../lib/favicon';

const PRESET_COLORS = [
  '#0D9488', '#2563EB', '#7C3AED', '#DB2777', '#EA580C',
  '#059669', '#D97706', '#DC2626', '#0284C7', '#4F46E5',
];

interface BrandIdentitySectionProps {
  data: BrandIdentity;
  clientName: string;
  clientDescription: string;
  onChange: (data: BrandIdentity) => void;
  onClientNameChange: (name: string) => void;
  onClientDescriptionChange: (description: string) => void;
}

const BrandIdentitySection: React.FC<BrandIdentitySectionProps> = ({
  data,
  clientName,
  clientDescription,
  onChange,
  onClientNameChange,
  onClientDescriptionChange,
}) => {
  const update = (field: keyof BrandIdentity, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const industryOptions = Object.entries(INDUSTRY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading font-semibold text-foreground mb-1">Brand Identity</h2>
        <p className="text-sm text-muted-foreground">Core brand information and positioning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Client Name *</label>
          <Input
            value={clientName}
            onChange={(e) => onClientNameChange(e.target.value)}
            placeholder="Company name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Brand Name</label>
          <Input
            value={data.brand_name || ''}
            onChange={(e) => update('brand_name', e.target.value)}
            placeholder="Brand name (if different from client)"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
        <Textarea
          value={clientDescription}
          onChange={(e) => onClientDescriptionChange(e.target.value)}
          placeholder="Brief description of the client / brand..."
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Tagline</label>
        <Input
          value={data.tagline || ''}
          onChange={(e) => update('tagline', e.target.value)}
          placeholder="Brand tagline or slogan"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Positioning Statement</label>
        <Textarea
          value={data.positioning || ''}
          onChange={(e) => update('positioning', e.target.value)}
          placeholder="What makes this brand unique? How does it position itself in the market?"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Industry</label>
          <Select
            value={data.industry || ''}
            onChange={(e) => update('industry', e.target.value || undefined)}
            options={[{ value: '', label: 'Select industry...' }, ...industryOptions]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Website</label>
          <Input
            type="url"
            value={data.website || ''}
            onChange={(e) => update('website', e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Logo URL</label>
        <div className="flex items-center gap-3">
          <Input
            type="url"
            value={data.logo_url || ''}
            onChange={(e) => update('logo_url', e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          {data.logo_url && (
            <img
              src={data.logo_url}
              alt="Logo preview"
              className="w-8 h-8 rounded object-contain border border-gray-200"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Used as the client icon instead of initials</p>
        {!data.logo_url && data.website && (() => {
          const faviconUrl = getClientLogoUrl({ website: data.website });
          return faviconUrl ? (
            <div className="flex items-center gap-2 mt-2 p-2 bg-teal-50 rounded-md">
              <img
                src={faviconUrl}
                alt="Auto-detected favicon"
                className="w-6 h-6 rounded object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-xs text-teal-700">Auto-detected from website. Add a manual logo URL above to override.</span>
            </div>
          ) : null;
        })()}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Brand Color</label>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  data.brand_color === color ? 'border-foreground scale-110' : 'border-transparent hover:border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => update('brand_color', color)}
              />
            ))}
          </div>
          <Input
            value={data.brand_color || ''}
            onChange={(e) => update('brand_color', e.target.value)}
            placeholder="#0D9488"
            className="!w-28"
          />
          {data.brand_color && (
            <div
              className="w-7 h-7 rounded-full border border-gray-200"
              style={{ backgroundColor: data.brand_color }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandIdentitySection;
