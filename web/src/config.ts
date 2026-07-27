export interface DTSConfigInput {
  apiKey: string;
  endpointUrl: string;
  maxRetries?: number;
  maxBatchSize?: number;
  flushIntervalMs?: number;
  /** Auto-capture click events on interactive elements. Default: true */
  autoCaptureClicks?: boolean;
  /** Auto-capture form submissions and field interactions. Default: true */
  autoCaptureForms?: boolean;
  /** Auto-capture scroll depth milestones. Default: true */
  autoCaptureScroll?: boolean;
  /** Auto-capture Web Vitals (LCP, FCP, CLS, TTFB, INP). Default: true */
  autoCapturePerformance?: boolean;
  /** Require GDPR consent before tracking. Default: false */
  consentRequired?: boolean;
  /** Capture install referrer on first launch. Emits an `install` event with referrer data. Default: false */
  captureInstallReferrer?: boolean;
}

export interface DTSConfig {
  readonly apiKey: string;
  readonly endpointUrl: string;
  readonly maxRetries: number;
  readonly maxBatchSize: number;
  readonly flushIntervalMs: number;
  readonly autoCaptureClicks: boolean;
  readonly autoCaptureForms: boolean;
  readonly autoCaptureScroll: boolean;
  readonly autoCapturePerformance: boolean;
  readonly consentRequired: boolean;
  readonly captureInstallReferrer: boolean;
}

const DEFAULTS: Required<Pick<DTSConfig, 'maxRetries' | 'maxBatchSize' | 'flushIntervalMs' | 'autoCaptureClicks' | 'autoCaptureForms' | 'autoCaptureScroll' | 'autoCapturePerformance' | 'consentRequired' | 'captureInstallReferrer'>> = {
  maxRetries: 5,
  maxBatchSize: 20,
  flushIntervalMs: 5000,
  autoCaptureClicks: true,
  autoCaptureForms: true,
  autoCaptureScroll: true,
  autoCapturePerformance: true,
  consentRequired: false,
  captureInstallReferrer: false,
};

export function resolveConfig(input: DTSConfigInput): DTSConfig {
  if (!input.apiKey) {
    throw new Error('DTS RIS: apiKey is required');
  }
  if (!input.endpointUrl) {
    throw new Error('DTS RIS: endpointUrl is required');
  }

  return {
    apiKey: input.apiKey,
    endpointUrl: input.endpointUrl.replace(/\/+$/, ''),
    maxRetries: input.maxRetries ?? DEFAULTS.maxRetries,
    maxBatchSize: input.maxBatchSize ?? DEFAULTS.maxBatchSize,
    flushIntervalMs: input.flushIntervalMs ?? DEFAULTS.flushIntervalMs,
    autoCaptureClicks: input.autoCaptureClicks ?? DEFAULTS.autoCaptureClicks,
    autoCaptureForms: input.autoCaptureForms ?? DEFAULTS.autoCaptureForms,
    autoCaptureScroll: input.autoCaptureScroll ?? DEFAULTS.autoCaptureScroll,
    autoCapturePerformance: input.autoCapturePerformance ?? DEFAULTS.autoCapturePerformance,
    consentRequired: input.consentRequired ?? DEFAULTS.consentRequired,
    captureInstallReferrer: input.captureInstallReferrer ?? DEFAULTS.captureInstallReferrer,
  };
}
