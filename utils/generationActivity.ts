import type { GenerationJobProgress } from '../types/database';
import type { GenerationStatus } from '../types/generationActivity';

interface GenerationProgressModelInput {
  status: GenerationStatus;
  generationStep: number | null;
  jobProgress?: GenerationJobProgress | null;
}

export interface GenerationProgressModel {
  label: string;
  percentage: number;
}

export function getGenerationStatusBadgeLabel(status: GenerationStatus): string {
  if (status === 'analyzing_competitors') return 'Analyzing';
  if (status === 'generating_brief') return 'Generating Brief';
  if (status === 'generating_content') return 'Generating Article';
  return 'Idle';
}

export type BatchDisplayStatus =
  | 'running'
  | 'completed'
  | 'partially_failed'
  | 'cancelled'
  | 'failed';

export interface BatchStatusDisplay {
  label: string;
  badgeVariant: 'teal' | 'success' | 'warning' | 'error';
  progressColor: 'teal' | 'yellow' | 'red';
}

export function getBatchStatusDisplay(status: string, failedJobs: number): BatchStatusDisplay {
  switch (status) {
    case 'running':
      return {
        label: 'Running',
        badgeVariant: failedJobs > 0 ? 'warning' : 'teal',
        progressColor: failedJobs > 0 ? 'yellow' : 'teal',
      };
    case 'completed':
      return {
        label: failedJobs > 0 ? 'Completed with errors' : 'Completed',
        badgeVariant: failedJobs > 0 ? 'warning' : 'success',
        progressColor: failedJobs > 0 ? 'yellow' : 'teal',
      };
    case 'partially_failed':
      return {
        label: 'Partial failure',
        badgeVariant: 'warning',
        progressColor: 'yellow',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        badgeVariant: 'warning',
        progressColor: 'yellow',
      };
    case 'failed':
      return {
        label: 'Failed',
        badgeVariant: 'error',
        progressColor: 'red',
      };
    default:
      return {
        label: status.replace(/_/g, ' '),
        badgeVariant: 'teal',
        progressColor: 'teal',
      };
  }
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function asCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function withCounterLabel(baseLabel: string, current: number | null, total: number | null): string {
  if (current == null || total == null || total <= 0) return baseLabel;
  return `${baseLabel} (${current}/${total})`;
}

function getCompetitorLabel(progress: GenerationJobProgress): string {
  switch (progress.phase) {
    case 'serp':
      return withCounterLabel(
        'Analyzing Keywords',
        asCount(progress.completed_keywords),
        asCount(progress.total_keywords)
      );
    case 'onpage':
      return withCounterLabel(
        'Scraping Competitor Pages',
        asCount(progress.completed_urls),
        asCount(progress.total_urls)
      );
    case 'saving':
      return 'Saving Results';
    case 'complete':
      return 'Analysis Complete';
    default:
      return 'Analyzing Competitors';
  }
}

function getBriefLabel(progress: GenerationJobProgress, generationStep: number | null): string {
  const stepName = progress.step_name?.trim();
  const currentStep = asCount(progress.current_step) ?? generationStep ?? 1;
  const totalSteps = asCount(progress.total_steps) ?? 7;

  if (stepName) {
    return `${stepName} (Step ${currentStep}/${totalSteps})`;
  }

  return `Generating Brief (Step ${currentStep}/${totalSteps})`;
}

function getArticleLabel(progress: GenerationJobProgress): string {
  const sectionName = progress.current_section?.trim() || 'Generating Content';
  const currentIndex = asCount(progress.current_index);
  const totalSections = asCount(progress.total_sections);

  if (currentIndex != null && totalSections != null && totalSections > 0) {
    return `${sectionName} (Section ${currentIndex}/${totalSections})`;
  }

  return sectionName;
}

function getFallbackPercentage(status: GenerationStatus, generationStep: number | null): number {
  if (status === 'analyzing_competitors') return 15;
  if (status === 'generating_brief' && generationStep) return 20 + (generationStep / 7) * 60;
  if (status === 'generating_content') return 85;
  return 0;
}

function getDerivedPercentage(
  status: GenerationStatus,
  progress: GenerationJobProgress,
  generationStep: number | null
): number {
  if (typeof progress.percentage === 'number' && Number.isFinite(progress.percentage)) {
    return clampPercentage(progress.percentage);
  }

  if (status === 'generating_brief') {
    const currentStep = asCount(progress.current_step);
    const totalSteps = asCount(progress.total_steps);
    if (currentStep != null && totalSteps != null && totalSteps > 0) {
      return clampPercentage(Math.round((currentStep / totalSteps) * 100));
    }
  }

  if (status === 'generating_content') {
    const currentIndex = asCount(progress.current_index);
    const totalSections = asCount(progress.total_sections);
    if (currentIndex != null && totalSections != null && totalSections > 0) {
      return clampPercentage(Math.round((currentIndex / totalSections) * 100));
    }
  }

  if (status === 'analyzing_competitors') {
    if (progress.phase === 'serp') {
      const done = asCount(progress.completed_keywords);
      const total = asCount(progress.total_keywords);
      if (done != null && total != null && total > 0) {
        return clampPercentage(Math.round((done / total) * 40));
      }
    }

    if (progress.phase === 'onpage') {
      const done = asCount(progress.completed_urls);
      const total = asCount(progress.total_urls);
      if (done != null && total != null && total > 0) {
        return clampPercentage(40 + Math.round((done / total) * 50));
      }
    }

    if (progress.phase === 'saving') return 90;
    if (progress.phase === 'complete') return 100;
  }

  return clampPercentage(getFallbackPercentage(status, generationStep));
}

export function getGenerationProgressModel({
  status,
  generationStep,
  jobProgress,
}: GenerationProgressModelInput): GenerationProgressModel {
  const progress = jobProgress || {};

  if (status === 'analyzing_competitors') {
    return {
      label: getCompetitorLabel(progress),
      percentage: getDerivedPercentage(status, progress, generationStep),
    };
  }

  if (status === 'generating_brief') {
    return {
      label: getBriefLabel(progress, generationStep),
      percentage: getDerivedPercentage(status, progress, generationStep),
    };
  }

  if (status === 'generating_content') {
    return {
      label: getArticleLabel(progress),
      percentage: getDerivedPercentage(status, progress, generationStep),
    };
  }

  return {
    label: 'Idle',
    percentage: 0,
  };
}
