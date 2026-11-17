import { describe, it, expect, beforeEach } from 'vitest';
import { getAnonymousUserId, getSessionId, hasInstallBeenTracked, markInstallTracked } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('genera e persiste l\u2019anonymousUserId (stabile tra chiamate)', () => {
    const a = getAnonymousUserId();
    const b = getAnonymousUserId();
    expect(a).toBe(b);
    expect(a).toMatch(/[0-9a-f-]{36}/);
    expect(localStorage.getItem('dtsris_uid')).toBe(a);
  });

  it('cambia anonymousUserId solo dopo un reset esplicito del localStorage', () => {
    const a = getAnonymousUserId();
    localStorage.clear();
    const b = getAnonymousUserId();
    expect(a).not.toBe(b);
  });

  it('genera sessionId di sessione (sessionStorage)', () => {
    const s = getSessionId();
    expect(s).toMatch(/[0-9a-f-]{36}/);
    expect(sessionStorage.getItem('dtsris_sid')).toBe(s);
  });

  it('hasInstallBeenTracked è false prima e true dopo markInstallTracked', () => {
    expect(hasInstallBeenTracked()).toBe(false);
    markInstallTracked();
    markInstallTracked(); // idempotente
    expect(hasInstallBeenTracked()).toBe(true);
  });
});