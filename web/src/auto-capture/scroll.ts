/**
 * Auto-capture scroll depth as percentage milestones reached.
 * Fires once per milestone (25%, 50%, 75%, 90%, 100%) per page.
 */
const MILESTONES = [25, 50, 75, 90, 100];

export function installScrollDepthCapture(
  emit: (eventType: 'scroll_depth', props: Record<string, unknown>) => void,
): () => void {
  const reached = new Set<number>();

  const handler = (): void => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;

    const scrolled = window.scrollY;
    const pct = Math.round((scrolled / scrollHeight) * 100);

    for (const milestone of MILESTONES) {
      if (pct >= milestone && !reached.has(milestone)) {
        reached.add(milestone);
        emit('scroll_depth', { depthPct: milestone });
      }
    }
  };

  // Throttled scroll listener
  let ticking = false;
  const onScroll = (): void => {
    if (!ticking) {
      requestAnimationFrame(() => {
        handler();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial check
  if (document.readyState === 'complete') {
    handler();
  } else {
    window.addEventListener('load', handler, { once: true });
  }

  return () => {
    window.removeEventListener('scroll', onScroll);
  };
}
