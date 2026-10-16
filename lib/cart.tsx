'use client';

// Browser-only shopping cart. Items persist in localStorage on the customer's
// own phone — nothing is sent to any server except the final WhatsApp message.
// Works fully with static export (no API, no database writes).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
  slug: string;
  name: string;
  /** Final (offer-applied) unit price snapshot in Rs at the time of adding. */
  unitPrice: number;
  image: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'chaitus-cart';

function validItem(v: unknown): v is CartItem {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.slug === 'string' &&
    typeof o.name === 'string' &&
    typeof o.unitPrice === 'number' &&
    typeof o.image === 'string' &&
    typeof o.qty === 'number'
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(arr) ? arr.filter(validItem).slice(0, 50) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full or blocked — cart simply won't persist */
    }
  }, [items]);

  const add = useCallback((item: Omit<CartItem, 'qty'>, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((p) => p.slug === item.slug);
      if (found) {
        return prev.map((p) =>
          p.slug === item.slug ? { ...p, qty: Math.min(99, p.qty + qty) } : p,
        );
      }
      return [...prev, { ...item, unitPrice: Math.round(item.unitPrice), qty: Math.min(99, Math.max(1, qty)) }].slice(0, 50);
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((prev) => prev.filter((p) => p.slug !== slug));
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    setItems((prev) =>
      qty < 1
        ? prev.filter((p) => p.slug !== slug)
        : prev.map((p) => (p.slug === slug ? { ...p, qty: Math.min(99, qty) } : p)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const { count, total } = useMemo(() => {
    return {
      count: items.reduce((a, p) => a + p.qty, 0),
      total: items.reduce((a, p) => a + p.unitPrice * p.qty, 0),
    };
  }, [items]);

  const value = useMemo(
    () => ({ items, count, total, isOpen, openCart, closeCart, add, remove, setQty, clear }),
    [items, count, total, isOpen, openCart, closeCart, add, remove, setQty, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
