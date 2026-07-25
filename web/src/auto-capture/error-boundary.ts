/**
 * React Error Boundary instrumentation helper.
 * Richer than window.onerror — captures component stack and error type metadata.
 */

export interface ErrorBoundaryReport {
  error: Error;
  componentStack?: string;
  errorInfo?: string;
}

/**
 * Call from a React Error Boundary's componentDidCatch or the error fallback.
 * Pass the result to the tracker via `track('error_boundary', report)`.
 *
 * Example:
 *   class Boundary extends React.Component {
 *     componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
 *       const report = captureErrorBoundary(error, errorInfo.componentStack);
 *       window.DTSRIS?.track('error_boundary', report);
 *     }
 *   }
 */
export function captureErrorBoundary(
  error: Error,
  componentStack?: string,
): Record<string, unknown> {
  const sanitized = sanitizeMessage(error.message);

  return {
    message: sanitized,
    name: error.name,
    source: 'react_error_boundary',
    ...(componentStack ? { componentStack: trimStack(componentStack) } : {}),
    ...(error.stack ? { stack: trimStack(stripPII(error.stack)) } : {}),
  };
}

function sanitizeMessage(message: string): string {
  return stripPII(message).slice(0, 500);
}

function stripPII(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/gi, '[REDACTED]')
    .replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[REDACTED]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]');
}

function trimStack(stack: string): string {
  return stack.split('\n').slice(0, 10).join('\n');
}
