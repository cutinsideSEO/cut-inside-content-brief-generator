import React from 'react';
import { Input, Select } from '../../ui';
import type { ContentStrategy, OperationalSettings } from '../../../types/clientProfile';

interface DefaultsSectionProps {
  contentStrategy: ContentStrategy;
  operationalSettings: OperationalSettings;
  onContentStrategyChange: (data: ContentStrategy) => void;
  onOperationalSettingsChange: (data: OperationalSettings) => void;
}

const DefaultsSection: React.FC<DefaultsSectionProps> = ({
  contentStrategy,
  operationalSettings,
  onContentStrategyChange,
  onOperationalSettingsChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading font-semibold text-foreground mb-1">Defaults</h2>
        <p className="text-sm text-muted-foreground">Default settings pre-filled when creating new briefs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Output Language</label>
          <Input
            value={contentStrategy.default_output_language || ''}
            onChange={(e) => onContentStrategyChange({ ...contentStrategy, default_output_language: e.target.value })}
            placeholder="English"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">SERP Language</label>
          <Input
            value={contentStrategy.default_serp_language || ''}
            onChange={(e) => onContentStrategyChange({ ...contentStrategy, default_serp_language: e.target.value })}
            placeholder="English"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">SERP Country</label>
          <Input
            value={contentStrategy.default_serp_country || ''}
            onChange={(e) => onContentStrategyChange({ ...contentStrategy, default_serp_country: e.target.value })}
            placeholder="United States"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Contact Info</label>
        <Input
          value={operationalSettings.contact_info || ''}
          onChange={(e) => onOperationalSettingsChange({ ...operationalSettings, contact_info: e.target.value })}
          placeholder="Contact email or info for the brand"
        />
      </div>
    </div>
  );
};

export default DefaultsSection;
