// WhatsApp ordering helpers.
// Number and message format are fixed by the business spec — do not change
// the message structure without asking the client.

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '917396345773';

export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://chaitus-naturals.pages.dev').replace(/\/$/, '');

interface OrderDetails {
  productName: string;
  finalPrice: number;
  mainImageUrl: string;
  productSlug: string;
}

/**
 * Build the wa.me link. Message structure (exact):
 *
 *   Hello Chaitu's Naturals, I want to order:
 *
 *   Product: {name}
 *   Price: ₹{final price}
 *   Product photo: {main image URL}
 *   Product link: {product page URL} (/product/?slug=...)
 *
 *   Name:
 *   Address:
 *   Quantity:
 *   Related things / notes:
 */
export function buildWhatsAppLink(d: OrderDetails): string {
  const productUrl = `${SITE_URL}/product/?slug=${encodeURIComponent(d.productSlug)}`;
  const message =
    `Hello Chaitu's Naturals, I want to order:\n\n` +
    `Product: ${d.productName}\n` +
    `Price: ₹${d.finalPrice}\n` +
    `Product photo: ${d.mainImageUrl}\n` +
    `Product link: ${productUrl}\n\n` +
    `Name:\n` +
    `Address:\n` +
    `Quantity:\n` +
    `Related things / notes:`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export interface CartOrderItem {
  productName: string;
  unitPrice: number;
  quantity: number;
}

/**
 * Multi-item order link for the cart. Same plain-language style:
 *
 *   Hello Chaitu's Naturals, I want to order:
 *
 *   1. Herbal Hair Oil × 2 — ₹508
 *   2. Neem Comb × 1 — ₹99
 *
 *   Total: ₹607
 *
 *   Name:
 *   Address:
 *   Related things / notes:
 */
export function buildCartWhatsAppLink(items: CartOrderItem[]): string {
  const lines = items.map(
    (it, i) => `${i + 1}. ${it.productName} × ${it.quantity} — ₹${Math.round(it.unitPrice * it.quantity)}`,
  );
  const total = items.reduce((a, it) => a + it.unitPrice * it.quantity, 0);
  const message =
    `Hello Chaitu's Naturals, I want to order:\n\n` +
    lines.join('\n') +
    `\n\nTotal: ₹${Math.round(total)}\n\n` +
    `Name:\n` +
    `Address:\n` +
    `Related things / notes:`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
