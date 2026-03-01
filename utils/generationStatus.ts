import type { ContentBrief } from '../types';
import type { BriefStatus, GenerationJobType } from '../types/database';

export type BriefGenerationStatus = 'idle' | 'analyzing_competitors' | 'generating_brief' | 'generating_content';

const ACTIVE_BRIEF_GENERATION_STATUSES: BriefGenerationStatus[] = [
  'analyzing_competitors',
  'generating_brief',
  'generating_content',
];

const COMPLETE_REQUIRED_FIELDS: Array<keyof ContentBrief> = [
  'page_goal',
  'target_audience',
  'keyword_strategy',
  'competitor_insights',
  'content_gap_analysis',
  'article_structure',
  'faqs',
  'on_page_seo',
];

interface BriefStatusForListInput {
  status: BriefStatus;
  current_step: number;
  active_job_id: string | null;
  brief_data?: Partial<ContentBrief> | null;
}

function hasAllGeneratedSections(briefData?: Partial<ContentBrief> | null): boolean {
  if (!briefData) return false;
  return COMPLETE_REQUIRED_FIELDS.every((field) => Boolean(briefData[field]));
}

export function isBriefActivelyGenerating(status?: BriefGenerationStatus): boolean {
  if (!status) return false;
  return ACTIVE_BRIEF_GENERATION_STATUSES.includes(status);
}

export function shouldMarkBriefCompleteOnJobCompletion(jobType?: GenerationJobType | null): boolean {
  return jobType === 'full_brief';
}

export function getEffectiveBriefStatusForList(brief: BriefStatusForListInput): BriefStatus {
  if (brief.status !== 'complete') {
    return brief.status;
  }

  if (brief.active_job_id) {
    return 'in_progress';
  }

  if (brief.current_step < 7) {
    return 'in_progress';
  }

  if (!hasAllGeneratedSections(brief.brief_data)) {
    return 'in_progress';
  }

  return 'complete';
}
