import React, { useState } from 'react';
import type { LengthConstraints } from '../types';
import { ChevronDownIcon, HashIcon } from './Icon';

interface LengthSettingsProps {
  constraints: LengthConstraints;
  onChange: (constraints: LengthConstraints) => void;
  currentWordCount?: number;
}

const presets = [
  { label: 'Short', value: 800, description: 'Quick read, ~3-4 min' },
  { label: 'Medium', value: 1500, description: 'Standard article, ~6-7 min' },
  { label: 'Long', value: 2500, description: 'In-depth guide, ~10-12 min' },
  { label: 'Comprehensive', value: 4000, description: 'Ultimate guide, ~16-18 min' },
  { label: 'Custom', value: null, description: 'Set your own target' },
];

const LengthSettings: React.FC<LengthSettingsProps> = ({ constraints, onChange, currentWordCount }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customValue, setCustomValue] = useState(constraints.globalTarget?.toString() || '');

  const handlePresetClick = (preset: typeof presets[0]) => {
    if (preset.value === null) {
      // Custom - keep current value or use empty
      setCustomValue(constraints.globalTarget?.toString() || '');
    } else {
      setCustomValue(preset.value.toString());
      onChange({ ...constraints, globalTarget: preset.value });
    }
  };

  const handleCustomChange = (value: string) => {
    setCustomValue(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onChange({ ...constraints, globalTarget: numValue });
    } else if (value === '') {
      onChange({ ...constraints, globalTarget: null });
    }
  };

  const isActivePreset = (preset: typeof presets[0]) => {
    if (preset.value === null) {
      return !presets.some(p => p.value !== null && p.value === constraints.globalTarget);
    }
    return preset.value === constraints.globalTarget;
  };

  return (
    <div className="bg-black/30 rounded-lg border border-white/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-lg"
      >
        <div className="flex items-center space-x-3">
          <HashIcon className="h-5 w-5 text-teal" />
          <div>
            <h3 className="font-heading font-semibold text-gray-600">Word Count Target</h3>
            {constraints.globalTarget ? (
              <p className="text-sm text-gray-600/60">
                Target: {constraints.globalTarget.toLocaleString()} words
                {currentWordCount !== undefined && (
                  <span className="ml-2 text-teal">
                    (Current: ~{currentWordCount.toLocaleString()})
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-600/60">No target set (AI decides)</p>
            )}
          </div>
        </div>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-600/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className={`p-2 rounded-lg border text-center transition-all ${
                  isActivePreset(preset)
                    ? 'border-teal bg-teal/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <span className="block font-medium text-sm text-gray-600">{preset.label}</span>
                {preset.value && (
                  <span className="block text-xs text-gray-600/50">{preset.value.toLocaleString()}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600/80 mb-1">
                Custom Word Count
              </label>
              <input
                type="number"
                value={customValue}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="e.g., 2000"
                min="100"
                max="20000"
                className="w-full p-2 bg-background border border-white/20 rounded-md text-gray-600 focus:ring-1 focus:ring-teal"
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="strictMode"
                checked={constraints.strictMode}
                onChange={(e) => onChange({ ...constraints, strictMode: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-background text-teal focus:ring-teal"
              />
              <label htmlFor="strictMode" className="text-sm text-gray-600/80">
                Strict limit
              </label>
            </div>
          </div>

          <p className="text-xs text-gray-600/50">
            {constraints.strictMode
              ? 'Content will stay within the target word count.'
              : 'Target is a guideline - AI may adjust based on topic depth.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default LengthSettings;
