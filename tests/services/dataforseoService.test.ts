import { describe, it, expect } from 'vitest';

describe('dataforseoService', () => {
  it('exports getOnPageElementsViaProxy function', async () => {
    const mod = await import('../../services/dataforseoService');
    expect(typeof mod.getOnPageElementsViaProxy).toBe('function');
  });
});
