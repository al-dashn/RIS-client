/**
 * Auto-capture form interactions: submissions and field focus/blur.
 * Reports field names and form metadata without field values.
 */
export function installFormCapture(
  emit: (eventType: 'form_submit' | 'form_focus' | 'form_blur', props: Record<string, unknown>) => void,
): () => void {
  const cleanupFns: Array<() => void> = [];

  // --- Form submissions ---
  const onSubmit = (e: SubmitEvent): void => {
    const form = e.target as HTMLFormElement | null;
    if (!form) return;
    if (form.hasAttribute('data-dtsris-ignore')) return;

    const fields = Array.from(form.elements)
      .filter((el): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
        el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement,
      )
      .map((el) => ({
        name: el.name || el.id || undefined,
        type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
      }))
      .filter((f) => f.name);

    emit('form_submit', {
      formId: form.id || undefined,
      formAction: stripQuery(form.action || window.location.pathname),
      formMethod: (form.method || 'get').toLowerCase(),
      fieldCount: fields.length,
      fieldNames: fields.map((f) => f.name),
    });
  };

  document.addEventListener('submit', onSubmit, true);
  cleanupFns.push(() => document.removeEventListener('submit', onSubmit, true));

  // --- Field focus/blur ---
  const onFocus = (e: FocusEvent): void => {
    const el = e.target as HTMLElement | null;
    if (!el) return;
    if (el.hasAttribute('data-dtsris-ignore')) return;
    if (!isFormField(el)) return;

    emit('form_focus', {
      fieldName: getFieldName(el),
      fieldType: getFieldType(el),
    });
  };

  const onBlur = (e: FocusEvent): void => {
    const el = e.target as HTMLElement | null;
    if (!el) return;
    if (el.hasAttribute('data-dtsris-ignore')) return;
    if (!isFormField(el)) return;

    emit('form_blur', {
      fieldName: getFieldName(el),
      fieldType: getFieldType(el),
    });
  };

  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('focusout', onBlur, true);
  cleanupFns.push(() => document.removeEventListener('focusin', onFocus, true));
  cleanupFns.push(() => document.removeEventListener('focusout', onBlur, true));

  return () => cleanupFns.forEach((fn) => fn());
}

function isFormField(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'select' || tag === 'textarea';
}

function getFieldName(el: HTMLElement): string | undefined {
  const input = el as HTMLInputElement;
  return input.name || input.id || undefined;
}

function getFieldType(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) return el.type || 'text';
  return el.tagName.toLowerCase();
}

function stripQuery(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname;
  } catch {
    return url.split(/[?#]/)[0] ?? url;
  }
}
