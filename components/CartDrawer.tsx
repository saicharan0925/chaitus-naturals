'use client';

// Cart slide-over: qty steppers, remove, total, single "order everything on
// WhatsApp" button. Pure client-side — no server, no stored customer data.

import { useEffect } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { buildCartWhatsAppLink } from '@/lib/whatsapp';
import { formatINR } from '@/lib/pricing';

export default function CartDrawer() {
  const { items, count, total, isOpen, closeCart, setQty, remove, clear } = useCart();
  const reduce = useReducedMotion();

  // Escape closes; background page doesn't scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, closeCart]);

  const waLink =
    items.length > 0
      ? buildCartWhatsAppLink(
          items.map((p) => ({ productName: p.name, unitPrice: p.unitPrice, quantity: p.qty })),
        )
      : '#';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={closeCart}
            aria-hidden="true"
            className="fixed inset-0 z-50 bg-black/50"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`Your cart, ${count} items`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 80 }}
            transition={{ duration: reduce ? 0.1 : 0.25 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-card-hover"
          >
            <div className="flex items-center justify-between border-b border-sand px-4 py-3">
              <h2 className="font-serif text-xl font-bold text-leaf-900">Your Cart ({count})</h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-2xl text-stone-600 hover:bg-beige"
              >
                ×
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="font-serif text-lg font-bold text-leaf-900">Your cart is empty</p>
                <p className="text-sm text-stone-600">Tap “Add to Cart” on any product to collect items, then order everything together on WhatsApp.</p>
                <button
                  type="button"
                  onClick={closeCart}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-leaf-700 px-8 font-semibold text-white"
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <ul className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
                  {items.map((p) => (
                    <li key={p.slug} className="flex gap-3 rounded-2xl border border-sand bg-white p-3">
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-beige">
                        {p.image ? (
                          <Image src={p.image} alt="" fill sizes="64px" className="object-cover" loading="lazy" />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-serif text-[15px] font-bold text-leaf-900">{p.name}</span>
                        <span className="text-sm text-stone-500">{formatINR(p.unitPrice)} each</span>
                        <span className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQty(p.slug, p.qty - 1)}
                            aria-label={`One less ${p.name}`}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-sand text-xl text-stone-700"
                          >
                            −
                          </button>
                          <span aria-live="polite" className="min-w-6 text-center font-semibold">{p.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(p.slug, p.qty + 1)}
                            aria-label={`One more ${p.name}`}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-sand text-xl text-stone-700"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(p.slug)}
                            aria-label={`Remove ${p.name} from cart`}
                            className="ml-auto inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-red-700"
                          >
                            Remove
                          </button>
                        </span>
                      </span>
                      <span className="shrink-0 text-[15px] font-bold text-bark-dark">{formatINR(p.unitPrice * p.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2 border-t border-sand bg-white px-4 py-4">
                  <p className="flex items-baseline justify-between">
                    <span className="text-stone-600">Total</span>
                    <span className="font-serif text-2xl font-bold text-bark-dark">{formatINR(total)}</span>
                  </p>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#1FA855] px-6 font-semibold text-white"
                  >
                    Order all on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={clear}
                    className="inline-flex min-h-[44px] items-center justify-center text-sm font-medium text-stone-500"
                  >
                    Clear cart
                  </button>
                  <p className="text-center text-xs text-stone-500">You confirm everything on WhatsApp — no advance needed here.</p>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
