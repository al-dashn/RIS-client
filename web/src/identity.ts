/**
 * User identity resolution — link anonymous user to logged-in user.
 * Manages identity state and emits `identify` events.
 */

const IDENTITY_KEY = 'dtsris_identity';

export interface UserTraits {
  [key: string]: unknown;
}

export interface IdentityState {
  userId: string | null;
  traits: UserTraits | null;
  identifiedAt: string | null;
}

let identityState: IdentityState = loadIdentity();

function loadIdentity(): IdentityState {
  try {
    const raw = sessionStorage.getItem(IDENTITY_KEY);
    if (raw) return JSON.parse(raw) as IdentityState;
  } catch {
    // Ignore parse errors
  }
  return { userId: null, traits: null, identifiedAt: null };
}

function saveIdentity(): void {
  try {
    sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identityState));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the current identity state (userId + traits).
 */
export function getIdentity(): IdentityState {
  return { ...identityState };
}

/**
 * Identify the current user. Links the anonymous user ID to a known user.
 * Emits an `identify` event and enriches all subsequent events with `user_id`.
 */
export function identify(
  userId: string,
  traits: UserTraits = {},
  emit: (eventType: 'identify', props: Record<string, unknown>) => void,
): void {
  const previousUserId = identityState.userId;

  identityState = {
    userId,
    traits,
    identifiedAt: new Date().toISOString(),
  };
  saveIdentity();

  emit('identify', {
    user_id: userId,
    previous_user_id: previousUserId ?? undefined,
    is_new_identification: !previousUserId || previousUserId !== userId,
    ...Object.fromEntries(
      Object.entries(traits).filter(([, v]) => v !== undefined),
    ),
  });
}

/**
 * Clear the identity (on logout). Emits a `logout` event.
 */
export function resetIdentity(
  emit: (eventType: 'logout', props: Record<string, unknown>) => void,
): void {
  const previousUserId = identityState.userId;
  if (!previousUserId) return;

  identityState = { userId: null, traits: null, identifiedAt: null };
  saveIdentity();

  emit('logout', { user_id: previousUserId });
}
