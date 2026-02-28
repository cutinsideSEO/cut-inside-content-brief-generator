export interface AccessCodeScope {
  is_admin?: boolean | null
  client_ids?: string[] | null
}

export type ChainJobOutcome = 'chained' | 'cancelled' | 'failed'

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
