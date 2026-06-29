export type EventType = 'screen_view' | 'cart_update' | 'customization' | 'error';

export interface DTSEvent {
  eventType: EventType;
  timestamp: string;
  sessionId: string;
  anonymousUserId: string;
  properties: Record<string, unknown>;
}

export function createEvent(
  eventType: EventType,
  sessionId: string,
  anonymousUserId: string,
  properties: Record<string, unknown> = {},
): DTSEvent {
  return {
    eventType,
    timestamp: new Date().toISOString(),
    sessionId,
    anonymousUserId,
    properties,
  };
}
