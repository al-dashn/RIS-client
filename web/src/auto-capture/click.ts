/**
 * Auto-capture click events on interactive elements.
 * Reports element metadata (tag, id, classes, text) without PII.
 */
export function installClickCapture(
  emit: (eventType: 'click', props: Record<string, unknown>) => void,
): () => void {
  const handler = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Find the nearest interactive element
    const interactive = target.closest(
      'a, button, [role="button"], [data-dtsris-click]',
    ) as HTMLElement | null;
    if (!interactive) return;

    // Respect opt-out attribute
    if (interactive.hasAttribute('data-dtsris-ignore')) return;

    const tag = interactive.tagName.toLowerCase();
    const text = sanitizeText(getElementText(interactive));
    const href = tag === 'a' ? (interactive as HTMLAnchorElement).getAttribute('href') ?? undefined : undefined;
    const elementId = interactive.id || undefined;
    const classes = interactive.className && typeof interactive.className === 'string'
      ? interactive.className.split(/\s+/).filter(Boolean).slice(0, 5)
      : undefined;

    emit('click', {
      tag,
      ...(text ? { text } : {}),
      ...(href ? { href: stripQuery(href) } : {}),
      ...(elementId ? { elementId } : {}),
      ...(classes && classes.length ? { classes } : {}),
    });
  };

  document.addEventListener('click', handler, true);

  return () => {
    document.removeEventListener('click', handler, true);
  };
}

/** Extract visible text from an element, truncated to 100 chars. */
function getElementText(el: HTMLElement): string {
  const text = (el.textContent ?? '').trim();
  return text.slice(0, 100);
}

/** Strip query strings and fragments from URLs to avoid PII leakage. */
function stripQuery(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname;
  } catch {
    return url.split(/[?#]/)[0] ?? url;
  }
}

/** Remove potential PII patterns from text. */
function sanitizeText(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/gi, '[REDACTED]')
    .replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[REDACTED]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]');
}
