export type EventType = string; // Any event name — the ingestion API accepts all strings

export interface DTSEvent {
  eventId: string;
  eventType: EventType;
  timestamp: string;
  sessionId: string;
  anonymousUserId: string;
  page: string;
  properties: Record<string, unknown>;
}

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createEvent(
  eventType: EventType,
  sessionId: string,
  anonymousUserId: string,
  page: string,
  properties: Record<string, unknown> = {},
): DTSEvent {
  return {
    eventId: generateEventId(),
    eventType,
    timestamp: new Date().toISOString(),
    sessionId,
    anonymousUserId,
    page,
    properties,
  };
}
