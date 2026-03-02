import { describe, expect, it } from 'vitest';
import {
  isJobStaleForRecovery,
  resolveRecoveryPolicy,
  resolveQueueModelSettings,
  shouldHaltJobProcessing,
  shouldCountFailedChainSlot,
  userHasClientAccess,
} from '../../supabase/functions/_shared/generation-guards';

describe('generation guards', () => {
  describe('userHasClientAccess', () => {
    it('allows admins for any client', () => {
      expect(userHasClientAccess({ is_admin: true, client_ids: [] }, 'client-a')).toBe(true);
    });

    it('allows non-admins only for assigned clients', () => {
      expect(userHasClientAccess({ is_admin: false, client_ids: ['client-a'] }, 'client-a')).toBe(true);
      expect(userHasClientAccess({ is_admin: false, client_ids: ['client-a'] }, 'client-b')).toBe(false);
    });
  });

  describe('shouldHaltJobProcessing', () => {
    it('halts when the job itself is cancelled', () => {
      expect(shouldHaltJobProcessing('cancelled', 'running')).toBe(true);
    });

    it('halts when the batch is cancelled', () => {
      expect(shouldHaltJobProcessing('running', 'cancelled')).toBe(true);
    });

    it('continues when both job and batch are active', () => {
      expect(shouldHaltJobProcessing('running', 'running')).toBe(false);
    });
  });

  describe('shouldCountFailedChainSlot', () => {
    it('counts only true chain-creation failures as failed slots', () => {
      expect(shouldCountFailedChainSlot('chained')).toBe(false);
      expect(shouldCountFailedChainSlot('cancelled')).toBe(false);
      expect(shouldCountFailedChainSlot('failed')).toBe(true);
    });
  });

  describe('isJobStaleForRecovery', () => {
    it('uses updated_at heartbeat to avoid resetting actively updating jobs', () => {
      const cutoff = '2026-03-01T10:00:00.000Z';
      const job = {
        started_at: '2026-03-01T09:00:00.000Z',
        updated_at: '2026-03-01T10:05:00.000Z',
      };
      expect(isJobStaleForRecovery(job, cutoff)).toBe(false);
    });

    it('treats job as stale when latest heartbeat is before cutoff', () => {
      const cutoff = '2026-03-01T10:00:00.000Z';
      const job = {
        started_at: '2026-03-01T09:00:00.000Z',
        updated_at: '2026-03-01T09:30:00.000Z',
      };
      expect(isJobStaleForRecovery(job, cutoff)).toBe(true);
    });

    it('falls back to started_at when updated_at is missing', () => {
      const cutoff = '2026-03-01T10:00:00.000Z';
      const staleJob = { started_at: '2026-03-01T09:00:00.000Z', updated_at: null };
      const freshJob = { started_at: '2026-03-01T10:10:00.000Z', updated_at: null };

      expect(isJobStaleForRecovery(staleJob, cutoff)).toBe(true);
      expect(isJobStaleForRecovery(freshJob, cutoff)).toBe(false);
    });
  });

  describe('resolveRecoveryPolicy', () => {
    it('uses a wider timeout and retry budget for article jobs', () => {
      const policy = resolveRecoveryPolicy({
        job_type: 'article',
        max_retries: 3,
        progress: { percentage: 40 },
      });

      expect(policy.timeoutMinutes).toBe(8);
      expect(policy.maxRetries).toBe(6);
    });

    it('uses an even wider window for late-stage article jobs', () => {
      const policy = resolveRecoveryPolicy({
        job_type: 'article',
        max_retries: 6,
        progress: { percentage: 90, current_section: 'Trimming article to target word count...' },
      });

      expect(policy.timeoutMinutes).toBe(12);
      expect(policy.maxRetries).toBe(8);
    });

    it('keeps default policy for non-article jobs', () => {
      const policy = resolveRecoveryPolicy({
        job_type: 'full_brief',
        max_retries: 3,
        progress: { percentage: 57 },
      });

      expect(policy.timeoutMinutes).toBe(4);
      expect(policy.maxRetries).toBe(3);
    });
  });

  describe('resolveQueueModelSettings', () => {
    it('uses Gemini 3 Pro for article structure (step 5)', () => {
      const settings = resolveQueueModelSettings('full_brief', 5, {
        model: 'gemini-2.5-pro',
        thinkingLevel: 'high',
      });
      expect(settings.model).toBe('gemini-3-pro-preview');
      expect(settings.thinkingLevel).toBe('high');
    });

    it('uses Gemini 3 Flash for non-structure brief steps', () => {
      const settings = resolveQueueModelSettings('brief_step', 2, {
        model: 'gemini-2.5-pro',
        thinkingLevel: 'medium',
      });
      expect(settings.model).toBe('gemini-3-flash-preview');
      expect(settings.thinkingLevel).toBe('medium');
    });

    it('uses Gemini 3 Pro for article jobs', () => {
      const settings = resolveQueueModelSettings('article', null, {
        model: 'gemini-2.5-pro',
        thinkingLevel: 'high',
      });
      expect(settings.model).toBe('gemini-3-pro-preview');
      expect(settings.thinkingLevel).toBe('high');
    });
  });
});
