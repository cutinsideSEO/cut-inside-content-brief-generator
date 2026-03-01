export interface AccessCodeScope {
  is_admin?: boolean | null
  client_ids?: string[] | null
}

export interface RecoveryHeartbeatJob {
  started_at?: string | null
  updated_at?: string | null
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
