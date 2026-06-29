export function installCartUpdateCapture(
  emit: (eventType: 'cart_update', props: Record<string, unknown>) => void,
): () => void {
  // Listen for clicks on elements with data-dtsris-cart-action attributes
  const handler = (e: MouseEvent): void => {
    const target = (e.target as HTMLElement).closest(
      '[data-dtsris-cart-action]',
    ) as HTMLElement | null;
    if (!target) return;

    const action = target.getAttribute('data-dtsris-cart-action') || 'unknown';
    const productId = target.getAttribute('data-dtsris-product-id') || undefined;
    const quantityStr = target.getAttribute('data-dtsris-quantity');
    const quantity = quantityStr ? parseInt(quantityStr, 10) : undefined;

    emit('cart_update', {
      action,
      ...(productId ? { productId } : {}),
      ...(quantity !== undefined ? { quantity } : {}),
    });
  };

  document.addEventListener('click', handler, true);

  return () => {
    document.removeEventListener('click', handler, true);
  };
}
