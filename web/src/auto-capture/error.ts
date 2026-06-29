export function installErrorCapture(
  emit: (eventType: 'error', props: Record<string, unknown>) => void,
): () => void {
  // Global error handler
  const onError = (event: ErrorEvent): void => {
    emit('error', {
      message: stripPII(event.message),
      source: 'window.onerror',
    });
  };

  // Unhandled promise rejections
  const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    emit('error', {
      message: stripPII(String(event.reason?.message ?? event.reason ?? 'unknown')),
      source: 'unhandledrejection',
    });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}

function stripPII(message: string): string {
  // Remove potential email addresses
  let cleaned = message.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/gi, '[REDACTED]');
  // Remove potential phone numbers (basic pattern)
  cleaned = cleaned.replace(
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    '[REDACTED]',
  );
  // Remove potential SSN-like patterns
  cleaned = cleaned.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]');
  // Remove query strings that might contain PII
  cleaned = cleaned.replace(/[?&][^?&\s]+=[^?&\s]+/g, '?[REDACTED]');
  return cleaned;
}
