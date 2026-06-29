export interface DTSConfigInput {
  apiKey: string;
  endpointUrl: string;
  maxRetries?: number;
  maxBatchSize?: number;
  flushIntervalMs?: number;
}

export interface DTSConfig {
  readonly apiKey: string;
  readonly endpointUrl: string;
  readonly maxRetries: number;
  readonly maxBatchSize: number;
  readonly flushIntervalMs: number;
}

const DEFAULTS: Pick<DTSConfig, 'maxRetries' | 'maxBatchSize' | 'flushIntervalMs'> = {
  maxRetries: 5,
  maxBatchSize: 20,
  flushIntervalMs: 5000,
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
  };
}
