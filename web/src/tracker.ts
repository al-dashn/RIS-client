import { DTSConfig, DTSConfigInput, resolveConfig } from './config';
import { getAnonymousUserId, getSessionId } from './storage';
import { createEvent, DTSEvent, EventType } from './events';
import { retryWithBackoff } from './retry';
import { installScreenViewCapture } from './auto-capture/screen-view';
import { installCartUpdateCapture } from './auto-capture/cart-update';
import { installCustomizationCapture } from './auto-capture/customization';
import { installErrorCapture } from './auto-capture/error';

export type { DTSConfig, DTSConfigInput, DTSEvent, EventType };

export class DTSTracker {
  private readonly config: DTSConfig;
  private readonly anonymousUserId: string;
  private readonly sessionId: string;
  private eventQueue: DTSEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private teardowns: Array<() => void> = [];
  private disposed = false;

  constructor(input: DTSConfigInput) {
    this.config = resolveConfig(input);
    this.anonymousUserId = getAnonymousUserId();
    this.sessionId = getSessionId();
  }

  start(): void {
    if (this.disposed) return;

    // Install auto-capture handlers
    this.teardowns.push(
      installScreenViewCapture((eventType, props) => this.emitter(eventType, props)),
    );
    this.teardowns.push(
      installCartUpdateCapture((eventType, props) => this.emitter(eventType, props)),
    );
    this.teardowns.push(
      installCustomizationCapture((eventType, props) => this.emitter(eventType, props)),
    );
    this.teardowns.push(
      installErrorCapture((eventType, props) => this.emitter(eventType, props)),
    );

    // Start flush timer — flush() handles errors internally
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  /** Manually enqueue an event. The event is batched and sent asynchronously. */
  track(eventType: EventType, properties: Record<string, unknown> = {}): void {
    if (this.disposed) return;

    const event = createEvent(
      eventType,
      this.sessionId,
      this.anonymousUserId,
      window.location.pathname,
      properties,
    );
    this.eventQueue.push(event);

    // If queue exceeds threshold, flush immediately (errors handled internally)
    if (this.eventQueue.length >= this.config.maxBatchSize) {
      this.flush();
    }
  }

  /** Flush all queued events to the server immediately. */
  async flush(): Promise<void> {
    if (this.disposed || this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0);
    try {
      await retryWithBackoff(
        () => this.sendBatch(batch),
        this.config.maxRetries,
      );
    } catch (err) {
      // Re-queue the events at the front so they are retried next flush
      this.eventQueue = [...batch, ...this.eventQueue];
      logError('Flush failed, events re-queued', err);
      // Never re-throw — callers fire-and-forget this method
    }
  }

  /** Stop the tracker and clean up. */
  dispose(): void {
    this.disposed = true;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    for (const teardown of this.teardowns) {
      try {
        teardown();
      } catch (err) {
        logError('Teardown failed during dispose', err);
      }
    }
    this.teardowns = [];
    // Final flush attempt (fire-and-forget, errors handled internally)
    this.flush();
  }

  private emitter(eventType: EventType, props: Record<string, unknown>): void {
    this.track(eventType, props);
  }

  private async sendBatch(batch: DTSEvent[]): Promise<void> {
    const response = await fetch(`${this.config.endpointUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `HTTP ${response.status}: ${body.slice(0, 200)}`,
      );
    }
  }
}

function logError(message: string, err: unknown): void {
  // Log without exposing PII — only safe metadata
  const code =
    err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error(`[DTS RIS] ${message}: ${code}`);
}
