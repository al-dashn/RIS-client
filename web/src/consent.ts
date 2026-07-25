/**
 * GDPR consent management.
 * Controls whether tracking events are emitted based on user consent.
 */

const CONSENT_KEY = 'dtsris_consent';

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing' | 'personalization';

export interface ConsentState {
  /** Whether consent has been given at all */
  granted: boolean;
  /** Which categories have been consented to */
  categories: ConsentCategory[];
  /** ISO timestamp of when consent was last updated */
  updatedAt: string | null;
}

const DEFAULT_CONSENT: ConsentState = {
  granted: false,
  categories: [],
  updatedAt: null,
};

let consentState: ConsentState = loadConsent();

function loadConsent(): ConsentState {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ConsentState;
      if (parsed && typeof parsed.granted === 'boolean') {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return { ...DEFAULT_CONSENT };
}

function saveConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentState));
  } catch {
    // Ignore
  }
}

export function getConsent(): ConsentState {
  return { ...consentState };
}

/**
 * Grant consent for specific categories.
 * Necessary consent is always implied when any consent is given.
 */
export function grantConsent(
  categories: ConsentCategory[],
  emit?: (eventType: 'consent_updated', props: Record<string, unknown>) => void,
): void {
  consentState = {
    granted: true,
    categories: [...new Set<ConsentCategory>([...categories, 'necessary'])],
    updatedAt: new Date().toISOString(),
  };
  saveConsent();

  emit?.('consent_updated', {
    granted: true,
    categories: consentState.categories,
  });
}

/**
 * Revoke all consent.
 */
export function revokeConsent(
  emit?: (eventType: 'consent_updated', props: Record<string, unknown>) => void,
): void {
  consentState = {
    granted: false,
    categories: [],
    updatedAt: new Date().toISOString(),
  };
  saveConsent();

  emit?.('consent_updated', {
    granted: false,
    categories: [],
  });
}

/**
 * Check if a specific tracking category is allowed.
 * If consent is not required (config.consentRequired = false), always returns true.
 */
export function isConsentAllowed(
  category: ConsentCategory,
  consentRequired: boolean,
): boolean {
  if (!consentRequired) return true;
  return consentState.granted && consentState.categories.includes(category);
}

/**
 * Check if any analytics tracking is currently allowed.
 */
export function isTrackingAllowed(consentRequired: boolean): boolean {
  if (!consentRequired) return true;
  return consentState.granted && consentState.categories.includes('analytics');
}
