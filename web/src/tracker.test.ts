import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DTSTracker } from './tracker';

const ENDPOINT = 'https://ris.example.com:3000';

function trackerOk(init?: Record<string, unknown>) {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve('{}'),
  } as unknown as Response;
}

function makeTracker(overrides: Record<string, unknown> = {}) {
  return new DTSTracker({
    apiKey: 'dts_test',
    endpointUrl: ENDPOINT,
    // disattiva l'auto-capture: il test copre solo la pipeline di track/flush
    autoCaptureClicks: false,
    autoCaptureForms: false,
    autoCaptureScroll: false,
    autoCapturePerformance: false,
    captureInstallReferrer: false,
    ...overrides,
  });
}

describe('DTSTracker', () => {
  let tracker: DTSTracker | null = null;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = '';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(trackerOk()));
  });

  afterEach(() => {
    tracker?.dispose();
    tracker = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('track() enqueued e flush() invia il batch a /events con X-API-Key', async () => {
    tracker = makeTracker();
    tracker.start();

    // lo start emette uno screen_view automatico: lo dreniamo per isolare il test
    await tracker.flush();

    tracker.track('checkout_started', { cart_total: 99.5 });
    await tracker.flush();

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[
      (fetch as ReturnType<typeof vi.fn>).mock.calls.length - 1
    ];
    expect(url).toBe(`${ENDPOINT}/events`);
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe('dts_test');

    const body = JSON.parse((init as RequestInit).body as string) as { events: unknown[] };
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      eventType: 'checkout_started',
      properties: { cart_total: 99.5 },
    });
  });

  it('flush a vuoto non effettua chiamate di rete', async () => {
    tracker = makeTracker();
    tracker.start();

    // drena lo screen_view automatico
    await tracker.flush();
    (fetch as ReturnType<typeof vi.fn>).mockClear();

    await tracker.flush();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('flush() con fallimento totale rimette gli eventi in coda (retry successivo)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('down'),
    } as unknown as Response));

    tracker = makeTracker({ maxRetries: 0 });
    tracker.start();

    tracker.track('event_one');
    await tracker.flush(); // fallisce, re-queue

    expect(fetch).toHaveBeenCalled();

    // ora la rete torna su: il flush successivo deve riuscire
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(trackerOk()));
    await tracker.flush();

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as { events: { eventType: string }[] };
    expect(body.events.map((e) => e.eventType)).toContain('event_one');
  });

  it('track() dopo dispose() è un no-op', async () => {
    tracker = makeTracker({ maxRetries: 0 });
    tracker.start();

    tracker.track('before');
    tracker.dispose();
    tracker.track('after');

    // il dispose fa un flush finale fire-and-forget (retry=0 → fetch immediato):
    // dreniamo la microtask queue per lasciarlo completare
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    const bodies = calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    ) as { events: { eventType: string }[] }[];
    const allTypes = bodies.flatMap((b) => b.events.map((e) => e.eventType));
    expect(allTypes).toContain('before');
    expect(allTypes).not.toContain('after');
  });

  it('con consentRequired gli eventi vengono droppati finch\u00e9 non c\u2019\u00e8 consenso', async () => {
    tracker = makeTracker({ consentRequired: true });
    tracker.start();

    tracker.track('should_be_dropped');
    await tracker.flush();
    expect(fetch).not.toHaveBeenCalled();

    // grantConsent emette un evento consent_updated (esso stesso tracciato)
    tracker.grantConsent(['analytics', 'necessary']);
    tracker.track('should_be_sent');
    await tracker.flush();

    expect(fetch).toHaveBeenCalled();
    const allBodies = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    ) as { events: { eventType: string }[] }[];
    const events = allBodies.flatMap((b) => b.events.map((e) => e.eventType));
    expect(events).not.toContain('should_be_dropped');
    expect(events).toContain('consent_updated');
    expect(events).toContain('should_be_sent');
  });

  it('identify() arricchisce gli eventi successivi con user_id', async () => {
    tracker = makeTracker();
    tracker.start();

    tracker.identify('user-42', { plan: 'pro' });
    tracker.track('page_action');
    await tracker.flush();

    const allBodies = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    ) as { events: { eventType: string; properties: Record<string, unknown> }[] }[];
    const events = allBodies.flatMap((b) => b.events);
    const pageAction = events.find((e) => e.eventType === 'page_action');
    expect(pageAction?.properties['user_id']).toBe('user-42');
  });

  it('il timer di flush invia periodicamente gli eventi accumulati', async () => {
    vi.useFakeTimers();
    tracker = makeTracker({ flushIntervalMs: 1000 });
    tracker.start();

    tracker.track('ticked');
    await vi.advanceTimersByTimeAsync(1100);

    expect(fetch).toHaveBeenCalled();
    const allBodies = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    ) as { events: { eventType: string }[] }[];
    const events = allBodies.flatMap((b) => b.events.map((e) => e.eventType));
    expect(events).toContain('ticked');
    vi.useRealTimers();
  });

  it('il batch superato maxBatchSize flusha immediatamente', async () => {
    tracker = makeTracker({ maxBatchSize: 2 });
    tracker.start();

    tracker.track('a');
    tracker.track('b'); // soglia raggiunta: flush sincrono

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as { events: unknown[] };
    expect(body.events).toHaveLength(2);
  });
});