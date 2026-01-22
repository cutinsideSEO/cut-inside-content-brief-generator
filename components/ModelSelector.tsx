import React from 'react';
import type { ModelSettings, GeminiModel, ThinkingLevel } from '../types';
import { BrainCircuitIcon, ZapIcon } from './Icon';

interface ModelSelectorProps {
  settings: ModelSettings;
  onChange: (settings: ModelSettings) => void;
  compact?: boolean;
}

const models: { value: GeminiModel; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'gemini-3-pro-preview',
    label: 'Gemini 3 Pro',
    description: 'Most intelligent, best for complex tasks',
    icon: <BrainCircuitIcon className="h-4 w-4" />,
  },
  {
    value: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    description: 'Fast, balanced & cost-effective',
    icon: <ZapIcon className="h-4 w-4" />,
  },
  {
    value: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Previous gen fallback',
    icon: <BrainCircuitIcon className="h-4 w-4 opacity-50" />,
  },
];

const thinkingLevels: { value: ThinkingLevel; label: string; description: string }[] = [
  { value: 'high', label: 'High', description: 'Deep reasoning for complex tasks' },
  { value: 'medium', label: 'Medium', description: 'Balanced reasoning' },
  { value: 'low', label: 'Low', description: 'Quick responses' },
  { value: 'minimal', label: 'Minimal', description: 'Fastest (Flash only)' },
];

const ModelSelector: React.FC<ModelSelectorProps> = ({ settings, onChange, compact = false }) => {
  const handleModelChange = (model: GeminiModel) => {
    // If switching to non-Flash and thinking is minimal, bump to low
    let thinkingLevel = settings.thinkingLevel;
    if (thinkingLevel === 'minimal' && !model.includes('flash')) {
      thinkingLevel = 'low';
    }
    onChange({ ...settings, model, thinkingLevel });
  };

  const handleThinkingChange = (thinkingLevel: ThinkingLevel) => {
    // Minimal is only available for Flash
    if (thinkingLevel === 'minimal' && !settings.model.includes('flash')) {
      return;
    }
    onChange({ ...settings, thinkingLevel });
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <select
          value={settings.model}
          onChange={(e) => handleModelChange(e.target.value as GeminiModel)}
          className="p-2 bg-black border border-white/20 rounded-md text-sm text-grey focus:ring-1 focus:ring-teal appearance-none bg-no-repeat pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.25rem center',
            backgroundSize: '1.25em 1.25em',
          }}
        >
          {models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-grey/80 mb-2">AI Model</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {models.map((m) => (
            <button
              key={m.value}
              onClick={() => handleModelChange(m.value)}
              className={`p-3 rounded-lg border text-left transition-all ${
                settings.model === m.value
                  ? 'border-teal bg-teal/10'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center space-x-2">
                {m.icon}
                <span className="font-medium text-grey">{m.label}</span>
              </div>
              <p className="text-xs text-grey/60 mt-1">{m.description}</p>
            </button>
          ))}
        </div>
      </div>

      {settings.model.includes('gemini-3') && (
        <div>
          <label className="block text-sm font-medium text-grey/80 mb-2">Thinking Level</label>
          <div className="flex bg-black/50 rounded-lg p-1">
            {thinkingLevels.map((level) => {
              const isDisabled = level.value === 'minimal' && !settings.model.includes('flash');
              return (
                <button
                  key={level.value}
                  onClick={() => handleThinkingChange(level.value)}
                  disabled={isDisabled}
                  className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
                    settings.thinkingLevel === level.value
                      ? 'bg-teal text-white'
                      : isDisabled
                      ? 'text-grey/30 cursor-not-allowed'
                      : 'text-grey/60 hover:bg-white/5'
                  }`}
                  title={isDisabled ? 'Minimal is only available for Flash model' : level.description}
                >
                  {level.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-grey/50 mt-1">
            Higher thinking = better quality for complex tasks, but slower
          </p>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
