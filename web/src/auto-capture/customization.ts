export function installCustomizationCapture(
  emit: (eventType: 'customization', props: Record<string, unknown>) => void,
): () => void {
  // Observe changes on elements with data-dtsris-customize attribute
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'attributes') continue;
      const target = mutation.target as HTMLElement;
      if (!target.hasAttribute?.('data-dtsris-customize')) continue;

      const attributeName = mutation.attributeName;
      const oldValue = mutation.oldValue;
      const newValue = target.getAttribute(attributeName!);

      emit('customization', {
        attribute: attributeName,
        oldValue,
        newValue,
        element: target.tagName.toLowerCase(),
      });
    }
  });

  // Start observing
  const targets = document.querySelectorAll('[data-dtsris-customize]');
  targets.forEach((el) => {
    observer.observe(el, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: el.getAttributeNames?.(),
    });
  });

  // Observe for dynamically added elements
  const domObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.hasAttribute?.('data-dtsris-customize')) {
          observer.observe(node, {
            attributes: true,
            attributeOldValue: true,
            attributeFilter: node.getAttributeNames?.(),
          });
        }
        const children = node.querySelectorAll?.('[data-dtsris-customize]');
        children?.forEach((el) => {
          observer.observe(el, {
            attributes: true,
            attributeOldValue: true,
            attributeFilter: el.getAttributeNames?.(),
          });
        });
      });
    }
  });
  domObserver.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    domObserver.disconnect();
  };
}
