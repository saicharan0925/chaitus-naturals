// Offer-price maths. Single source of truth used by cards, detail pages,
// the WhatsApp message, and the admin preview.

import type { Product } from './types';

/** True when the product currently has a live offer (flag on + end date not passed). */
export function isOfferActive(p: Pick<Product, 'has_offer' | 'offer_ends_at'>, now = new Date()): boolean {
  if (!p.has_offer) return false;
  if (p.offer_ends_at && new Date(p.offer_ends_at).getTime() <= now.getTime()) return false;
  return true;
}

/** Final price after applying the offer. Never below 0. Rounded to whole rupees. */
export function finalPrice(p: Pick<Product, 'price' | 'has_offer' | 'offer_kind' | 'offer_value' | 'offer_ends_at'>): number {
  if (!isOfferActive(p)) return p.price;
  if (p.offer_kind === 'percent') {
    const pct = Math.min(90, Math.max(0, p.offer_value));
    return Math.max(0, Math.round(p.price * (1 - pct / 100)));
  }
  return Math.max(0, Math.round(p.price - p.offer_value));
}

/** Badge text like "15% OFF" or "₹50 OFF". Empty string when no active offer. */
export function offerBadge(p: Pick<Product, 'price' | 'has_offer' | 'offer_kind' | 'offer_value' | 'offer_ends_at'>): string {
  if (!isOfferActive(p)) return '';
  if (p.offer_kind === 'percent') return `${p.offer_value}% OFF`;
  return `₹${p.offer_value} OFF`;
}

export function formatINR(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
