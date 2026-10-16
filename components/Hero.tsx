'use client';

// Hero: brand name, tagline (client-written), Shop Now scroll button.

import { motion, useReducedMotion } from 'framer-motion';
import Logo from './Logo';

export default function Hero() {
  const reduce = useReducedMotion();
  const anim = reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };
  return (
    <section id="home" aria-labelledby="hero-heading" className="leaf-pattern bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <motion.div {...anim} transition={{ duration: 0.6, ease: 'easeOut' }}>
          {/* Client logo (shows once public/logo.png is added) */}
          <Logo className="mx-auto mb-4 h-24 w-24 rounded-2xl" />
          <h1 id="hero-heading" className="font-serif text-4xl font-bold text-leaf-900 sm:text-5xl md:text-6xl">
            Chaitu&apos;s Naturals
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-stone-600 sm:text-xl">
            Handmade herbal care for hair &amp; skin — made in small batches with love.
          </p>
          <a
            href="#products"
            className="mt-8 inline-flex min-h-[44px] items-center rounded-full bg-leaf-700 px-8 py-3 text-base font-semibold text-white shadow-card transition hover:bg-leaf-600"
          >
            Shop Now
          </a>
        </motion.div>
      </div>
    </section>
  );
}
