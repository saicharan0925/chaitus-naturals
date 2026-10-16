'use client';

// Product card: photo gallery (arrows + swipe), name, description, price/offer,
// stock badge, rating, WhatsApp order button. Clicking the card opens detail.

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ProductWithImages } from '@/lib/types';
import { finalPrice, formatINR, isOfferActive, offerBadge } from '@/lib/pricing';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useCart } from '@/lib/cart';
import StarRating from './StarRating';

export default function ProductCard({ product }: { product: ProductWithImages }) {
  const reduce = useReducedMotion();
  const { add, openCart } = useCart();
  const images = product.images.length > 0 ? product.images : [];
  const [idx, setIdx] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const n = Math.max(images.length, 1);
  const offer = isOfferActive(product);
  const final = finalPrice(product);
  const mainUrl = images[0]?.image_url ?? '';

  const waLink = buildWhatsAppLink({
    productName: product.name,
    finalPrice: final,
    mainImageUrl: mainUrl,
    productSlug: product.slug,
  });

  const prev = (e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + n) % n);
  };
  const next = (e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % n);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    add({ slug: product.slug, name: product.name, unitPrice: final, image: mainUrl });
    openCart();
  };

  return (
    <motion.article
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-sand bg-white shadow-card transition-shadow hover:shadow-card-hover"
    >
      {/* Gallery */}
      <div
        className="relative aspect-square w-full bg-beige"
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const dx = e.changedTouches[0].clientX - touchX;
          if (dx > 40) setIdx((i) => (i - 1 + n) % n);
          else if (dx < -40) setIdx((i) => (i + 1) % n);
          setTouchX(null);
        }}
      >
        <a href={`/product/?slug=${encodeURIComponent(product.slug)}`} aria-label={`View ${product.name}`} className="absolute inset-0">
          {images.length > 0 ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={images[idx]?.id ?? idx}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
              >
                <Image
                  src={images[idx].image_url}
                  alt={images[idx].alt_text || product.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  loading="lazy"
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            <span className="flex h-full items-center justify-center text-stone-400">Photo coming soon</span>
          )}
        </a>
        {offer && (
          <span className="absolute left-3 top-3 rounded-full bg-bark px-3 py-1 text-xs font-bold text-cream">
            {offerBadge(product)}
          </span>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-stone-700 shadow sm:flex"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-stone-700 shadow sm:flex"
            >
              ›
            </button>
            <span className="absolute bottom-2 right-3 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white" aria-hidden="true">
              {idx + 1}/{images.length}
            </span>
          </>
        )}
      </div>

      {/* Body — compact so 2 cards fit per row on phones */}
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <a href={`/product/?slug=${encodeURIComponent(product.slug)}`} className="font-serif text-base font-bold leading-snug text-leaf-900 hover:underline sm:text-lg">
            {product.name}
          </a>
          {product.in_stock ? (
            <span className="shrink-0 rounded-full bg-leaf-100 px-2.5 py-1 text-xs font-semibold text-leaf-700">In Stock</span>
          ) : (
            <span className="shrink-0 rounded-full bg-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-500">Out of Stock</span>
          )}
        </div>
        <p className="line-clamp-1 text-xs text-stone-600 sm:line-clamp-2 sm:text-sm">{product.description}</p>
        <div className="flex flex-wrap items-baseline gap-x-2">
          {offer ? (
            <>
              <span className="text-xs text-stone-400 line-through sm:text-sm">{formatINR(product.price)}</span>
              <span className="text-lg font-bold text-bark-dark sm:text-xl">{formatINR(final)}</span>
            </>
          ) : (
            <span className="text-lg font-bold text-bark-dark sm:text-xl">{formatINR(product.price)}</span>
          )}
        </div>
        <StarRating avg={product.avg_rating} count={product.review_count} />
        {product.in_stock ? (
          <>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#1FA855] px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 sm:mt-2 sm:px-4 sm:text-[15px]"
              aria-label={`Order ${product.name} on WhatsApp`}
            >
              Order on WhatsApp
            </a>
            <button
              type="button"
              onClick={handleAdd}
              aria-label={`Add ${product.name} to cart`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-leaf-700 px-3 py-2 text-sm font-semibold text-leaf-700 transition hover:bg-leaf-50 sm:text-[15px]"
            >
              Add to Cart
            </button>
          </>
        ) : (
          <button type="button" disabled className="mt-1 inline-flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-xl bg-stone-200 px-3 py-2.5 text-sm font-semibold text-stone-500 sm:mt-2 sm:px-4 sm:text-[15px]">
            Out of Stock
          </button>
        )}
      </div>
    </motion.article>
  );
}
