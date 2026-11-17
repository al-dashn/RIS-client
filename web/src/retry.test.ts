import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff } from './retry';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ritorna il risultato al primo tentativo riuscito senza attese', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const p = retryWithBackoff(fn, 3);
    expect(await p).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('riprova e riesce dopo fallimenti intermedi', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('boom-1'))
      .mockRejectedValueOnce(new Error('boom-2'))
      .mockResolvedValue('ok');

    const p = retryWithBackoff(fn, 3);
    // avanzo i timer per i backoff intermedi
    vi.advanceTimersByTimeAsync(60_000);
    expect(await p).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('esauriti i retry propaga l\u2019ultimo errore', async () => {
    const err = new Error('sempre gi\u00f9');
    const fn = vi.fn().mockRejectedValue(err);

    const p = retryWithBackoff(fn, 2);
    vi.advanceTimersByTimeAsync(120_000);
    await expect(p).rejects.toThrow('sempre gi\u00f9');
    expect(fn).toHaveBeenCalledTimes(3); // 1 iniziale + 2 retry
  });

  it('con maxRetries=0 fa un solo tentativo', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'));
    const p = retryWithBackoff(fn, 0);
    vi.advanceTimersByTimeAsync(60_000);
    await expect(p).rejects.toThrow('x');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});