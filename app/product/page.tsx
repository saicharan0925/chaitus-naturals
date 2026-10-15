'use client';

// Product detail page (static route /product?slug=... — works with `output: export`
// with no rebuild needed when the admin adds products).
// Full gallery, description, price/offer, order button, approved reviews + form.

import { Suspense, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { getSupabase } from '@/lib/supabase';
import type { ProductWithImages, Review } from '@/lib/types';
import { finalPrice, formatINR, isOfferActive, offerBadge } from '@/lib/pricing';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import StarRating from '@/components/StarRating';
import ReviewForm from '@/components/ReviewForm';
import ContactSection from '@/components/ContactSection';

export const dynamic = 'force-static';

function ProductDetail() {
  const params = useSearchParams();
  const slug = params.get('slug') || '';
  const [product, setProduct] = useState<ProductWithImages | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [imgIdx, setImgIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    try {
      const sb = getSupabase();
      const { data: p } = await sb.from('products').select('*').eq('slug', slug).eq('active', true).maybeSingle();
      if (!p) {
        setNotFound(true);
        return;
      }
      const [{ data: imgs }, { data: revs }] = await Promise.all([
        sb.from('product_images').select('*').eq('product_id', p.id).order('position'),
        sb.from('reviews').select('*').eq('product_id', p.id).eq('approved', true).order('created_at', { ascending: false }),
      ]);
      const ratings = ((revs ?? []) as Review[]).map((r) => r.rating);
      setProduct({
        ...p,
        images: (imgs ?? []) as ProductWithImages['images'],
        review_count: ratings.length,
        avg_rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      });
      setReviews((revs ?? []) as Review[]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="mx-auto max-w-3xl px-4 py-16 text-center text-stone-500">Loading product…</p>;
  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-bold text-leaf-900">Product not found</h1>
        <p className="mt-2 text-stone-600">This product may be hidden or removed.</p>
        <Link href="/#products" className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-leaf-700 px-8 py-3 font-semibold text-white">
          Back to products
        </Link>
      </div>
    );
  }

  const offer = isOfferActive(product);
  const final = finalPrice(product);
  const waLink = buildWhatsAppLink({
    productName: product.name,
    finalPrice: final,
    mainImageUrl: product.images[0]?.image_url ?? '',
    productSlug: product.slug,
  });
  const n = product.images.length;

  return (
    <>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 pt-6 text-sm text-stone-500">
        <Link href="/" className="hover:underline">Home</Link> / <Link href="/#products" className="hover:underline">Products</Link> /{' '}
        <span aria-current="page" className="text-stone-700">{product.name}</span>
      </nav>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-sand bg-beige">
            {n > 0 ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={product.images[imgIdx]?.id ?? imgIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={product.images[imgIdx].image_url}
                    alt={product.images[imgIdx].alt_text || product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <span className="flex h-full items-center justify-center text-stone-400">Photo coming soon</span>
            )}
            {offer && (
              <span className="absolute left-3 top-3 rounded-full bg-bark px-3 py-1 text-xs font-bold text-cream">{offerBadge(product)}</span>
            )}
          </div>
          {n > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product photos">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  role="tab"
                  aria-selected={i === imgIdx}
                  aria-label={`Photo ${i + 1}`}
                  onClick={() => setImgIdx(i)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${i === imgIdx ? 'border-leaf-600' : 'border-transparent'}`}
                >
                  <Image src={img.image_url} alt="" fill sizes="80px" className="object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-3xl font-bold text-leaf-900 sm:text-4xl">{product.name}</h1>
          <StarRating avg={product.avg_rating} count={product.review_count} />
          <div className="flex items-baseline gap-3">
            {offer ? (
              <>
                <span className="text-lg text-stone-400 line-through">{formatINR(product.price)}</span>
                <span className="text-3xl font-bold text-bark-dark">{formatINR(final)}</span>
                <span className="rounded-full bg-bark px-3 py-1 text-xs font-bold text-cream">{offerBadge(product)}</span>
              </>
            ) : (
              <span className="text-3xl font-bold text-bark-dark">{formatINR(product.price)}</span>
            )}
          </div>
          {product.in_stock ? (
            <span className="w-fit rounded-full bg-leaf-100 px-3 py-1 text-sm font-semibold text-leaf-700">In Stock</span>
          ) : (
            <span className="w-fit rounded-full bg-stone-200 px-3 py-1 text-sm font-semibold text-stone-500">Out of Stock</span>
          )}
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-stone-700">{product.description}</p>
          {product.in_stock ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#1FA855] px-6 py-3 font-semibold text-white"
            >
              Order on WhatsApp
            </a>
          ) : (
            <button type="button" disabled className="mt-2 inline-flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-xl bg-stone-200 px-6 py-3 font-semibold text-stone-500">
              Out of Stock
            </button>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section aria-labelledby="pd-reviews" className="mx-auto max-w-6xl px-4 pb-14">
        <h2 id="pd-reviews" className="font-serif text-2xl font-bold text-leaf-900">
          Reviews ({reviews.length})
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            {reviews.length === 0 && <p className="text-stone-500">No reviews yet — be the first!</p>}
            {reviews.map((r) => (
              <article key={r.id} className="rounded-2xl border border-sand bg-white p-4">
                <StarRating avg={r.rating} count={1} />
                <p className="mt-2 text-[15px] text-stone-700">{r.review_text}</p>
                <p className="mt-2 text-sm text-stone-500">— {r.reviewer_name}</p>
              </article>
            ))}
          </div>
          <div>
            <ReviewForm productId={product.id} onSubmitted={load} />
          </div>
        </div>
      </section>
      <ContactSection />
    </>
  );
}

export default function ProductPage() {
  return (
    <Suspense fallback={<p className="px-4 py-16 text-center text-stone-500">Loading product…</p>}>
      <ProductDetail />
    </Suspense>
  );
}
