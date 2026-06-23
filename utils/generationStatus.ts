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

/**
 * The final logical step of the brief pipeline (On-Page SEO). A `full_brief` job
 * runs as a CHAIN of per-step jobs, each marked `completed` as it finishes, so a
 * job completing is only "brief complete" when it is this last step.
 */
export const FINAL_BRIEF_STEP = 7;

/**
 * Decide whether a completed generation job means the WHOLE brief is now complete.
 *
 * Only a `full_brief` job qualifies — and only when it is the final step in the
 * chain (`step_number === FINAL_BRIEF_STEP`). Intermediate `full_brief` steps emit
 * their own `completed` events as they chain to the next step; treating those as
 * brief-complete would prematurely flip the brief to `complete` / step 7 and
 * navigate to the dashboard after a single step.
 *
 * `regenerate` / `article` / `competitors` always return false (their completion
 * is handled by dedicated branches at the call site).
 *
 * When `stepNumber` is unknown (null/undefined), fall back to checking whether the
 * brief actually has every generated section, so we never falsely report complete.
 */
export function shouldMarkBriefCompleteOnJobCompletion(
  jobType?: GenerationJobType | null,
  stepNumber?: number | null,
  briefData?: Partial<ContentBrief> | null,
): boolean {
  if (jobType !== 'full_brief') {
    return false;
  }

  if (stepNumber != null) {
    return stepNumber === FINAL_BRIEF_STEP;
  }

  // step_number not available — only treat as complete if all sections exist.
  return hasAllGeneratedSections(briefData);
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
