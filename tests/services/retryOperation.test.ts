import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { retryOperation } from '../../supabase/functions/_shared/gemini-client';

describe('retryOperation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns result immediately on first success', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await retryOperation(operation, 3, 0, 5000);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds on 2nd attempt', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('transient error'))
      .mockResolvedValueOnce('success on 2nd');

    const result = await retryOperation(operation, 3, 0, 5000);

    expect(result).toBe('success on 2nd');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds on 3rd attempt', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success on 3rd');

    const result = await retryOperation(operation, 3, 0, 5000);

    expect(result).toBe('success on 3rd');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error after exhausting all retries', async () => {
    const error1 = new Error('fail 1');
    const error2 = new Error('fail 2');
    const lastError = new Error('final failure');

    const operation = vi.fn()
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2)
      .mockRejectedValueOnce(lastError);

    await expect(retryOperation(operation, 3, 0, 5000)).rejects.toThrow('final failure');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('wraps non-Error thrown values into an Error', async () => {
    const operation = vi.fn().mockRejectedValue('string error');

    await expect(retryOperation(operation, 1, 0, 5000)).rejects.toThrow('string error');
  });

  it('retries the correct number of times when all attempts fail', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(retryOperation(operation, 4, 0, 5000)).rejects.toThrow('always fails');
    expect(operation).toHaveBeenCalledTimes(4);
    expect(console.warn).toHaveBeenCalledTimes(4);
  });

  it('stops after 1 attempt when retries=1', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(retryOperation(operation, 1, 0, 5000)).rejects.toThrow('fail');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('per-attempt timeout fires when operation exceeds timeoutMs', async () => {
    // Operation resolves after 200ms, but timeout is only 50ms
    const slowOperation = vi.fn(
      () => new Promise<string>(resolve => setTimeout(() => resolve('too slow'), 200))
    );

    await expect(retryOperation(slowOperation, 1, 0, 50)).rejects.toThrow('Operation timed out after 50ms');
  });

  it('uses exponential backoff — each delay is at least double the previous', async () => {
    // We verify backoff by timing total elapsed for 3 failures.
    // delay=100ms: attempt 1 backoff=100ms, attempt 2 backoff=200ms → total wait >= 300ms
    const operation = vi.fn().mockRejectedValue(new Error('fail'));

    const start = Date.now();
    // retries=3, delay=100, timeoutMs=5000 → two inter-attempt waits: ~100ms and ~200ms
    await expect(retryOperation(operation, 3, 100, 5000)).rejects.toThrow('fail');
    const elapsed = Date.now() - start;

    // With jitter up to 500ms per delay, allow generous upper bound.
    // Lower bound: the two waits must be at least 100ms + 200ms = 300ms.
    expect(elapsed).toBeGreaterThanOrEqual(300);
    expect(elapsed).toBeLessThan(3000); // sanity ceiling
  });

  it('logs a warn message for every failed attempt', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('err'));

    await expect(retryOperation(operation, 3, 0, 5000)).rejects.toThrow();

    expect(console.warn).toHaveBeenCalledTimes(3);
    // First call warns about attempt 1
    expect((console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('Attempt 1');
    expect((console.warn as ReturnType<typeof vi.fn>).mock.calls[1][0]).toContain('Attempt 2');
    expect((console.warn as ReturnType<typeof vi.fn>).mock.calls[2][0]).toContain('Attempt 3');
  });
});
