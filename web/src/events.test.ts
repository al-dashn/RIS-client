import { describe, it, expect } from 'vitest';
import { createEvent } from './events';

describe('createEvent', () => {
  it('costruisce un evento con tutti i campi del contratto ingest', () => {
    const ev = createEvent('cart_update', 'sess-1', 'anon-1', '/product/1', {
      cart_id: 'cart-9',
    });

    expect(ev.eventType).toBe('cart_update');
    expect(ev.sessionId).toBe('sess-1');
    expect(ev.anonymousUserId).toBe('anon-1');
    expect(ev.page).toBe('/product/1');
    expect(ev.properties).toEqual({ cart_id: 'cart-9' });
    expect(ev.eventId).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    expect(new Date(ev.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('accetta qualsiasi nome evento (schema aperto) e properties opzionali', () => {
    const ev = createEvent('custom_event_xyz', 's', 'a', '/x');
    expect(ev.eventType).toBe('custom_event_xyz');
    expect(ev.properties).toEqual({});
  });

  it('genera eventId unici per eventi consecutivi', () => {
    const a = createEvent('e', 's', 'a', '/');
    const b = createEvent('e', 's', 'a', '/');
    expect(a.eventId).not.toBe(b.eventId);
  });
});