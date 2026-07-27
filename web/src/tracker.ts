import { DTSConfig, DTSConfigInput, resolveConfig } from './config';
import { getAnonymousUserId, getSessionId, hasInstallBeenTracked, markInstallTracked } from './storage';
import { createEvent, DTSEvent, EventType } from './events';
import { retryWithBackoff } from './retry';
import { installScreenViewCapture } from './auto-capture/screen-view';
import { installCartUpdateCapture } from './auto-capture/cart-update';
import { installCustomizationCapture } from './auto-capture/customization';
import { installErrorCapture } from './auto-capture/error';
import { installClickCapture } from './auto-capture/click';
import { installFormCapture } from './auto-capture/form';
import { installScrollDepthCapture } from './auto-capture/scroll';
import { installPerformanceCapture } from './auto-capture/performance';
import {
  identify,
  resetIdentity,
  getIdentity,
  type IdentityState,
  type UserTraits,
} from './identity';
import {
  grantConsent,
  revokeConsent,
  getConsent,
  isTrackingAllowed,
  type ConsentCategory,
  type ConsentState,
} from './consent';

export type { DTSConfig, DTSConfigInput, DTSEvent, EventType, IdentityState, UserTraits, ConsentCategory, ConsentState };

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

    // Install auto-capture handlers (conditional on config)
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

    if (this.config.autoCaptureClicks) {
      this.teardowns.push(
        installClickCapture((eventType, props) => this.emitter(eventType, props)),
      );
    }

    if (this.config.autoCaptureForms) {
      this.teardowns.push(
        installFormCapture((eventType, props) => this.emitter(eventType, props)),
      );
    }

    if (this.config.autoCaptureScroll) {
      this.teardowns.push(
        installScrollDepthCapture((eventType, props) => this.emitter(eventType, props)),
      );
    }

    if (this.config.autoCapturePerformance) {
      this.teardowns.push(
        installPerformanceCapture((eventType, props) => this.emitter(eventType, props)),
      );
    }

    // Capture install attribution on first launch if configured
    if (this.config.captureInstallReferrer && !hasInstallBeenTracked()) {
      try {
        this.captureInstallEvent();
      } catch {
        // Silently ignore — never crash the host app
      }
      markInstallTracked();
    }

    // Start flush timer — flush() handles errors internally
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  /** Manually enqueue an event. The event is batched and sent asynchronously.
   *  Respects consent: if consent is required and not granted, the event is dropped. */
  track(eventType: EventType, properties: Record<string, unknown> = {}): void {
    if (this.disposed) return;

    // Consent gate
    if (!isTrackingAllowed(this.config.consentRequired)) return;

    // Enrich with identity if available
    const identity = getIdentity();
    const enrichedProps = { ...properties };
    if (identity.userId) {
      enrichedProps['user_id'] = identity.userId;
    }

    const event = createEvent(
      eventType,
      this.sessionId,
      this.anonymousUserId,
      window.location.pathname,
      enrichedProps,
    );
    this.eventQueue.push(event);

    // If queue exceeds threshold, flush immediately (errors handled internally)
    if (this.eventQueue.length >= this.config.maxBatchSize) {
      this.flush();
    }
  }

  // ── Identity ──

  /** Link the current anonymous session to a logged-in user. Emits an `identify` event. */
  identify(userId: string, traits: UserTraits = {}): void {
    identify(userId, traits, (eventType, props) => {
      this.track(eventType, props);
    });
  }

  /** Clear the current user identity (on logout). Emits a `logout` event. */
  resetIdentity(): void {
    resetIdentity((eventType, props) => {
      this.track(eventType, props);
    });
  }

  /** Get the current identity state. */
  getIdentity(): IdentityState {
    return getIdentity();
  }

  // ── Consent ──

  /** Grant GDPR consent for the given categories. Emits a `consent_updated` event. */
  grantConsent(categories: ConsentCategory[]): void {
    grantConsent(categories, (eventType, props) => {
      this.track(eventType, props);
    });
  }

  /** Revoke all GDPR consent. Emits a `consent_updated` event. */
  revokeConsent(): void {
    revokeConsent((eventType, props) => {
      this.track(eventType, props);
    });
  }

  /** Get the current consent state. */
  getConsent(): ConsentState {
    return getConsent();
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

  private captureInstallEvent(): void {
    const referrer = document.referrer || undefined;

    // Collect UTM / campaign parameters from the current URL
    const params = new URLSearchParams(window.location.search);
    const deepLinkData: Record<string, string> = {};
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'campaign_id'];
    for (const key of utmKeys) {
      const val = params.get(key);
      if (val) {
        deepLinkData[key] = val;
      }
    }

    const properties: Record<string, unknown> = {};
    if (referrer) {
      properties['referrer'] = referrer;
    }
    if (Object.keys(deepLinkData).length > 0) {
      properties['deep_link_data'] = deepLinkData;
    }

    this.track('install', properties);
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
