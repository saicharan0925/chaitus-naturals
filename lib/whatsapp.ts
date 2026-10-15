// WhatsApp ordering helpers.
// Number and message format are fixed by the business spec — do not change
// the message structure without asking the client.

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '917396457733';

export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://chaitusnaturals.pages.dev').replace(/\/$/, '');

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
