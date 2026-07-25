/**
 * Auto-capture Web Vitals: LCP, FCP, CLS, TTFB.
 * Uses PerformanceObserver and web-vitals patterns.
 */
interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export function installPerformanceCapture(
  emit: (eventType: 'web_vital', props: Record<string, unknown>) => void,
): () => void {
  const cleanupFns: Array<() => void> = [];
  const reported = new Set<string>();

  const report = (metric: VitalMetric): void => {
    // Only report once per metric per page load
    const key = `${metric.name}-${metric.value.toFixed(0)}`;
    if (reported.has(key)) return;
    reported.add(key);

    emit('web_vital', {
      metricName: metric.name,
      metricValue: Math.round(metric.value * 100) / 100,
      metricRating: metric.rating,
    });
  };

  // --- LCP (Largest Contentful Paint) ---
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length === 0) return;
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      report({
        name: 'LCP',
        value: lastEntry.startTime,
        rating: lastEntry.startTime <= 2500 ? 'good' : lastEntry.startTime <= 4000 ? 'needs-improvement' : 'poor',
      });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    cleanupFns.push(() => lcpObserver.disconnect());
  } catch {
    // LCP not supported
  }

  // --- FCP (First Contentful Paint) ---
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          report({
            name: 'FCP',
            value: entry.startTime,
            rating: entry.startTime <= 1800 ? 'good' : entry.startTime <= 3000 ? 'needs-improvement' : 'poor',
          });
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
    cleanupFns.push(() => fcpObserver.disconnect());
  } catch {
    // FCP not supported
  }

  // --- CLS (Cumulative Layout Shift) ---
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      }
      report({
        name: 'CLS',
        value: clsValue,
        rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor',
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    cleanupFns.push(() => clsObserver.disconnect());
  } catch {
    // CLS not supported
  }

  // --- TTFB (Time to First Byte) via Navigation Timing ---
  try {
    const ttfbObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceNavigationTiming[];
      for (const entry of entries) {
        if (entry.responseStart > 0) {
          const ttfb = entry.responseStart - entry.requestStart;
          report({
            name: 'TTFB',
            value: ttfb,
            rating: ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs-improvement' : 'poor',
          });
        }
      }
    });
    ttfbObserver.observe({ type: 'navigation', buffered: true });
    cleanupFns.push(() => ttfbObserver.disconnect());
  } catch {
    // TTFB not supported
  }

  // --- INP (Interaction to Next Paint) ---
  try {
    let maxINP = 0;
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const dur = entry.duration;
        if (dur > maxINP) maxINP = dur;
      }
      report({
        name: 'INP',
        value: maxINP,
        rating: maxINP <= 200 ? 'good' : maxINP <= 500 ? 'needs-improvement' : 'poor',
      });
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 } as unknown as PerformanceObserverInit);
    cleanupFns.push(() => inpObserver.disconnect());
  } catch {
    // INP not supported
  }

  return () => cleanupFns.forEach((fn) => fn());
}
