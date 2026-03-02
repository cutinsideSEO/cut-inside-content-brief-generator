export interface AccessCodeScope {
  is_admin?: boolean | null
  client_ids?: string[] | null
}

export interface RecoveryHeartbeatJob {
  started_at?: string | null
  updated_at?: string | null
}

export interface RecoveryPolicyJob extends RecoveryHeartbeatJob {
  job_type?: string | null
  retry_count?: number | null
  max_retries?: number | null
  progress?: {
    percentage?: number | null
    current_section?: string | null
  } | null
}

export interface RecoveryPolicy {
  timeoutMinutes: number
  maxRetries: number
}

export interface QueueModelSettings {
  model?: string | null
  thinkingLevel?: string | null
}

export interface ResolvedQueueModelSettings {
  model: string
  thinkingLevel: string
}

export type ChainJobOutcome = 'chained' | 'cancelled' | 'failed'

const GEMINI_3_PRO_MODEL = 'gemini-3-pro-preview'
const GEMINI_3_FLASH_MODEL = 'gemini-3-flash-preview'
const DEFAULT_THINKING_LEVEL = 'high'
const DEFAULT_STALE_TIMEOUT_MINUTES = 4
const ARTICLE_STALE_TIMEOUT_MINUTES = 8
const ARTICLE_LATE_STAGE_TIMEOUT_MINUTES = 12
const DEFAULT_MAX_RETRIES = 3
const ARTICLE_MAX_RETRIES = 6
const ARTICLE_LATE_STAGE_MAX_RETRIES = 8
const RETRY_BACKOFF_BASE_SECONDS = 15
const RETRY_BACKOFF_MAX_SECONDS = 600

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export function userHasClientAccess(scope: AccessCodeScope, clientId: string): boolean {
  if (!clientId) return false
  if (scope.is_admin) return true
  return Array.isArray(scope.client_ids) && scope.client_ids.includes(clientId)
}

export function shouldHaltJobProcessing(
  jobStatus: string | null | undefined,
  batchStatus?: string | null
): boolean {
  return jobStatus === 'cancelled' || batchStatus === 'cancelled'
}

export function shouldCountFailedChainSlot(outcome: ChainJobOutcome): boolean {
  return outcome === 'failed'
}

/**
 * Returns true when a running job has no heartbeat newer than the cutoff.
 * Heartbeat uses updated_at (preferred) and falls back to started_at.
 */
export function isJobStaleForRecovery(job: RecoveryHeartbeatJob, cutoffIso: string): boolean {
  const cutoffMs = Date.parse(cutoffIso)
  if (Number.isNaN(cutoffMs)) return false

  const heartbeatIso = job.updated_at || job.started_at
  if (!heartbeatIso) return false

  const heartbeatMs = Date.parse(heartbeatIso)
  if (Number.isNaN(heartbeatMs)) return false

  return heartbeatMs < cutoffMs
}

/**
 * Resolves stale-timeout/retry policy by job characteristics.
 * Article jobs get a larger recovery window because long section/trim calls can
 * approach edge function timeout limits before the next checkpoint is written.
 */
export function resolveRecoveryPolicy(job: RecoveryPolicyJob): RecoveryPolicy {
  const progressPercentage = typeof job.progress?.percentage === 'number'
    ? job.progress.percentage
    : null
  const currentSection = normalizeString(job.progress?.current_section, '').toLowerCase()
  const isArticle = job.job_type === 'article'
  const isLateStageArticle = isArticle && (
    (progressPercentage !== null && progressPercentage >= 80) ||
    currentSection.includes('trim')
  )

  if (isLateStageArticle) {
    return {
      timeoutMinutes: ARTICLE_LATE_STAGE_TIMEOUT_MINUTES,
      maxRetries: Math.max(ARTICLE_LATE_STAGE_MAX_RETRIES, Number(job.max_retries) || 0),
    }
  }

  if (isArticle) {
    return {
      timeoutMinutes: ARTICLE_STALE_TIMEOUT_MINUTES,
      maxRetries: Math.max(ARTICLE_MAX_RETRIES, Number(job.max_retries) || 0),
    }
  }

  return {
    timeoutMinutes: DEFAULT_STALE_TIMEOUT_MINUTES,
    maxRetries: Math.max(DEFAULT_MAX_RETRIES, Number(job.max_retries) || 0),
  }
}

/**
 * Exponential retry backoff in seconds:
 * attempt 1 -> 15s, 2 -> 30s, 3 -> 60s ... capped at 10 minutes.
 */
export function computeRetryBackoffSeconds(nextRetryCount: number): number {
  const safeRetryCount = Number.isFinite(nextRetryCount) ? Math.max(1, Math.floor(nextRetryCount)) : 1
  const computed = RETRY_BACKOFF_BASE_SECONDS * Math.pow(2, safeRetryCount - 1)
  return Math.min(RETRY_BACKOFF_MAX_SECONDS, Math.max(RETRY_BACKOFF_BASE_SECONDS, computed))
}

export function resolveQueueModelSettings(
  jobType: string,
  stepNumber?: number | null,
  configured?: QueueModelSettings
): ResolvedQueueModelSettings {
  const thinkingLevel = normalizeString(configured?.thinkingLevel, DEFAULT_THINKING_LEVEL)

  if (jobType === 'article') {
    return {
      model: GEMINI_3_PRO_MODEL,
      thinkingLevel,
    }
  }

  if (jobType === 'brief_step' || jobType === 'full_brief' || jobType === 'regenerate') {
    return {
      model: stepNumber === 5 ? GEMINI_3_PRO_MODEL : GEMINI_3_FLASH_MODEL,
      thinkingLevel,
    }
  }

  return {
    model: normalizeString(configured?.model, GEMINI_3_PRO_MODEL),
    thinkingLevel,
  }
}
