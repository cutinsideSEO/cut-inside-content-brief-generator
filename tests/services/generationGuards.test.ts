import { describe, expect, it } from 'vitest';
import {
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
});
