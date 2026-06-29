export function installScreenViewCapture(
  emit: (eventType: 'screen_view', props: Record<string, unknown>) => void,
): () => void {
  const handler = (): void => {
    // Use pathname only — query strings and fragments may contain PII
    emit('screen_view', {
      path: window.location.pathname,
      title: document.title,
    });
  };

  // Capture on page load
  if (document.readyState === 'complete') {
    handler();
  } else {
    window.addEventListener('load', handler, { once: true });
  }

  // Capture on history-based navigation (SPA)
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  function onNavigate(): void {
    // Small delay so the DOM title updates
    setTimeout(handler, 50);
  }

  history.pushState = function (...args: any[]): void {
    originalPushState(...args);
    onNavigate();
  };
  history.replaceState = function (...args: any[]): void {
    originalReplaceState(...args);
    onNavigate();
  };
  window.addEventListener('popstate', onNavigate);
  window.addEventListener('hashchange', onNavigate);

  // Teardown
  return () => {
    window.removeEventListener('popstate', onNavigate);
    window.removeEventListener('hashchange', onNavigate);
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  };
}
