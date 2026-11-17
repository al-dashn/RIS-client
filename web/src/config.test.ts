import { describe, it, expect } from 'vitest';
import { resolveConfig } from './config';

describe('resolveConfig', () => {
  const base = { apiKey: 'dts_test', endpointUrl: 'https://ris.dashn.com:3000' };

  it('applica i default quando le opzioni sono omesse', () => {
    const c = resolveConfig(base);
    expect(c.maxRetries).toBe(5);
    expect(c.maxBatchSize).toBe(20);
    expect(c.flushIntervalMs).toBe(5000);
    expect(c.autoCaptureClicks).toBe(true);
    expect(c.autoCaptureForms).toBe(true);
    expect(c.autoCaptureScroll).toBe(true);
    expect(c.autoCapturePerformance).toBe(true);
    expect(c.consentRequired).toBe(false);
    expect(c.captureInstallReferrer).toBe(false);
  });

  it('lancia senza apiKey', () => {
    expect(() => resolveConfig({ ...base, apiKey: '' })).toThrow('apiKey is required');
  });

  it('lancia senza endpointUrl', () => {
    expect(() => resolveConfig({ ...base, endpointUrl: '' })).toThrow('endpointUrl is required');
  });

  it('normalizza gli slash finali dell\u2019endpoint', () => {
    expect(resolveConfig({ ...base, endpointUrl: 'https://ris.dashn.com:3000///' }).endpointUrl)
      .toBe('https://ris.dashn.com:3000');
  });

  it('rispetta gli override espliciti', () => {
    const c = resolveConfig({
      ...base,
      maxRetries: 1,
      maxBatchSize: 3,
      flushIntervalMs: 500,
      autoCaptureClicks: false,
      autoCaptureScroll: false,
      consentRequired: true,
      captureInstallReferrer: true,
    });
    expect(c.maxRetries).toBe(1);
    expect(c.maxBatchSize).toBe(3);
    expect(c.flushIntervalMs).toBe(500);
    expect(c.autoCaptureClicks).toBe(false);
    expect(c.autoCaptureScroll).toBe(false);
    expect(c.autoCaptureForms).toBe(true);
    expect(c.consentRequired).toBe(true);
    expect(c.captureInstallReferrer).toBe(true);
  });
});