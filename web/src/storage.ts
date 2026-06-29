const STORAGE_KEY_PREFIX = 'dtsris_';

function generateId(): string {
  // crypto.randomUUID is available in all modern browsers
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for extremely old environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getAnonymousUserId(): string {
  const key = `${STORAGE_KEY_PREFIX}uid`;
  try {
    let uid = localStorage.getItem(key);
    if (!uid) {
      uid = generateId();
      localStorage.setItem(key, uid);
    }
    return uid;
  } catch {
    // localStorage unavailable (e.g. privacy mode, iframe) — use in-memory
    let uid = (getAnonymousUserId as any).__memUid as string | undefined;
    if (!uid) {
      uid = generateId();
      (getAnonymousUserId as any).__memUid = uid;
    }
    return uid;
  }
}

export function getSessionId(): string {
  const key = `${STORAGE_KEY_PREFIX}sid`;
  try {
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = generateId();
      sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    let sid = (getSessionId as any).__memSid as string | undefined;
    if (!sid) {
      sid = generateId();
      (getSessionId as any).__memSid = sid;
    }
    return sid;
  }
}
