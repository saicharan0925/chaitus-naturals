'use client';

// Home page: hero, products grid, reviews teaser, contact.
// Products + ratings are fetched client-side from Supabase (static export safe).

import { useEffect, useMemo, useState } from 'react';
import Hero from '@/components/Hero';
import ProductCard from '@/components/ProductCard';
import Reveal from '@/components/Reveal';
import StarRating from '@/components/StarRating';
import { getSupabase } from '@/lib/supabase';
import type { ProductWithImages, Review } from '@/lib/types';

export default function HomePage() {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [recentReviews, setRecentReviews] = useState<(Review & { product_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        const { data: prods, error: e1 } = await sb
          .from('products')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });
        if (e1) throw e1;
        const list = (prods ?? []) as ProductWithImages[];
        // Images + approved reviews per product (small catalog — fine client-side)
        const enriched: ProductWithImages[] = await Promise.all(
          list.map(async (p) => {
            const [{ data: imgs }, { data: revs }] = await Promise.all([
              sb.from('product_images').select('*').eq('product_id', p.id).order('position'),
              sb.from('reviews').select('rating').eq('product_id', p.id).eq('approved', true),
            ]);
            const ratings = ((revs ?? []) as { rating: number }[]).map((r) => r.rating);
            return {
              ...p,
              images: (imgs ?? []) as ProductWithImages['images'],
              review_count: ratings.length,
              avg_rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
            };
          }),
        );
        const { data: rr } = await sb
          .from('reviews')
          .select('*')
          .eq('approved', true)
          .order('created_at', { ascending: false })
          .limit(6);
        if (!cancelled) {
          setProducts(enriched);
          const withNames = await Promise.all(
            ((rr ?? []) as Review[]).map(async (r) => {
              const prod = enriched.find((p) => p.id === r.product_id);
              return { ...r, product_name: prod?.name ?? 'A product' };
            }),
          );
          setRecentReviews(withNames);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load products.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const structuredProducts = useMemo(
    () =>
      products.slice(0, 20).map((p) => ({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.description,
        image: p.images.map((i) => i.image_url),
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: p.price,
          availability: p.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      })),
    [products],
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredProducts) }} />
      <Hero />

      {/* Products */}
      <section id="products" aria-labelledby="products-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <Reveal>
          <h2 id="products-heading" className="text-center font-serif text-3xl font-bold text-leaf-900">
            Our Products
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-stone-600">
            Everything is handmade in small batches. Tap a product to see more photos and reviews.
          </p>
        </Reveal>
        {loading && <p className="mt-8 text-center text-stone-500">Loading products…</p>}
        {error && (
          <p role="alert" className="mx-auto mt-8 max-w-md rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
            Could not load products ({error}). Please check your internet connection.
          </p>
        )}
        {!loading && !error && products.length === 0 && (
          <p className="mt-8 text-center text-stone-500">New products are coming soon — please check back or message us on WhatsApp.</p>
        )}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i % 4, 3) * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Reviews teaser */}
      <section id="reviews" aria-labelledby="reviews-heading" className="border-y border-sand bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <Reveal>
            <h2 id="reviews-heading" className="text-center font-serif text-3xl font-bold text-leaf-900">
              Customer Reviews
            </h2>
            <p className="mt-2 text-center text-stone-600">Real words from real customers. Every review is approved by us before it appears.</p>
          </Reveal>
          {recentReviews.length === 0 ? (
            <p className="mt-6 text-center text-stone-500">No reviews yet — be the first to review a product!</p>
          ) : (
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentReviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-sand bg-cream p-4">
                  <StarRating avg={r.rating} count={1} />
                  <p className="mt-2 text-[15px] text-stone-700">{r.review_text}</p>
                  <p className="mt-2 text-sm text-stone-500">
                    — {r.reviewer_name} · on {r.product_name}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
