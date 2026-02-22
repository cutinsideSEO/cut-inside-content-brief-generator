import React, { useState } from 'react';
import { Input, Textarea, Card } from '../../ui';
import Button from '../../Button';
import type { TargetAudience, AudiencePersona, AudienceType } from '../../../types/clientProfile';

interface TargetAudienceSectionProps {
  data: TargetAudience;
  onChange: (data: TargetAudience) => void;
}

const EMPTY_PERSONA: AudiencePersona = { name: '', description: '', pain_points: [], goals: [] };

const PersonaCard: React.FC<{
  persona: AudiencePersona;
  index: number;
  onChange: (persona: AudiencePersona) => void;
  onRemove: () => void;
}> = ({ persona, index, onChange, onRemove }) => {
  const [painPointInput, setPainPointInput] = useState('');
  const [goalInput, setGoalInput] = useState('');

  return (
    <Card variant="default" padding="md" className="relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Persona Name</label>
            <Input
              value={persona.name}
              onChange={(e) => onChange({ ...persona, name: e.target.value })}
              placeholder={`Persona ${index + 1}`}
              size="sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Description</label>
            <Input
              value={persona.description || ''}
              onChange={(e) => onChange({ ...persona, description: e.target.value })}
              placeholder="Brief persona description"
              size="sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Pain Points</label>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {persona.pain_points?.map((pp, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded border border-red-100">
                {pp}
                <button
                  type="button"
                  onClick={() => onChange({ ...persona, pain_points: persona.pain_points?.filter((_, idx) => idx !== i) })}
                  className="text-red-400 hover:text-red-700"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
          <Input
            value={painPointInput}
            onChange={(e) => setPainPointInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && painPointInput.trim()) {
                e.preventDefault();
                onChange({ ...persona, pain_points: [...(persona.pain_points || []), painPointInput.trim()] });
                setPainPointInput('');
              }
            }}
            placeholder="Type and press Enter..."
            size="sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Goals</label>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {persona.goals?.map((g, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-100">
                {g}
                <button
                  type="button"
                  onClick={() => onChange({ ...persona, goals: persona.goals?.filter((_, idx) => idx !== i) })}
                  className="text-emerald-400 hover:text-emerald-700"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
          <Input
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && goalInput.trim()) {
                e.preventDefault();
                onChange({ ...persona, goals: [...(persona.goals || []), goalInput.trim()] });
                setGoalInput('');
              }
            }}
            placeholder="Type and press Enter..."
            size="sm"
          />
        </div>
      </div>
    </Card>
  );
};

const TargetAudienceSection: React.FC<TargetAudienceSectionProps> = ({ data, onChange }) => {
  const [jobTitleInput, setJobTitleInput] = useState('');

  const update = (field: keyof TargetAudience, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const audienceTypes: { value: AudienceType; label: string }[] = [
    { value: 'b2b', label: 'B2B' },
    { value: 'b2c', label: 'B2C' },
    { value: 'both', label: 'Both' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading font-semibold text-foreground mb-1">Target Audience</h2>
        <p className="text-sm text-muted-foreground">Who the brand creates content for</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Audience Type</label>
        <div className="flex gap-2">
          {audienceTypes.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => update('audience_type', type.value)}
              className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                data.audience_type === type.value
                  ? 'bg-teal-50 border-teal-200 text-teal-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Demographics</label>
        <Textarea
          value={data.demographics || ''}
          onChange={(e) => update('demographics', e.target.value)}
          placeholder="Age range, location, income level, education..."
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Job Titles</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {data.job_titles?.map(title => (
            <span key={title} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-sm rounded-md border border-blue-100">
              {title}
              <button
                type="button"
                onClick={() => update('job_titles', data.job_titles?.filter(t => t !== title))}
                className="text-blue-400 hover:text-blue-700"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          ))}
        </div>
        <Input
          value={jobTitleInput}
          onChange={(e) => setJobTitleInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && jobTitleInput.trim()) {
              e.preventDefault();
              update('job_titles', [...(data.job_titles || []), jobTitleInput.trim()]);
              setJobTitleInput('');
            }
          }}
          placeholder="e.g., Marketing Manager, CTO..."
          size="sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-sm font-medium text-foreground">Personas</label>
            <p className="text-xs text-muted-foreground">Define ideal customer profiles</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => update('personas', [...(data.personas || []), { ...EMPTY_PERSONA }])}
          >
            Add Persona
          </Button>
        </div>
        <div className="space-y-3">
          {data.personas?.map((persona, index) => (
            <PersonaCard
              key={index}
              persona={persona}
              index={index}
              onChange={(updated) => {
                const personas = [...(data.personas || [])];
                personas[index] = updated;
                update('personas', personas);
              }}
              onRemove={() => {
                update('personas', data.personas?.filter((_, i) => i !== index));
              }}
            />
          ))}
          {(!data.personas || data.personas.length === 0) && (
            <p className="text-sm text-muted-foreground italic py-4 text-center">No personas defined yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TargetAudienceSection;
