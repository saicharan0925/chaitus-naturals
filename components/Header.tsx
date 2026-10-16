'use client';

// Site header: logo + brand name, nav, exactly ONE Contact button, mobile hamburger.
// No admin links on the public site (admin route is unlinked /admin).

import { useState } from 'react';
import Logo from './Logo';

const NAV = [
  { href: '#home', label: 'Home' },
  { href: '#products', label: 'Products' },
  { href: '#reviews', label: 'Reviews' },
];

// Single contact entry point (WhatsApp chat with pre-filled question).
const CONTACT_URL =
  'https://wa.me/917396345773?text=Hello%20Chaitu%27s%20Naturals%2C%20I%20have%20a%20question.';

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <a href="#home" className="flex min-h-[44px] items-center gap-2" aria-label="Chaitu's Naturals — home">
          <Logo />
          <span className="whitespace-nowrap font-serif text-base font-bold text-leaf-800 sm:text-2xl">
            Chaitu&apos;s Naturals
          </span>
        </a>
        {/* Laptop: nav links + Contact pill on the right */}
        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-stone-700 hover:text-leaf-700">
              {n.label}
            </a>
          ))}
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center rounded-full bg-leaf-700 px-5 text-[15px] font-semibold text-white transition hover:bg-leaf-600"
          >
            Contact
          </a>
        </nav>
        {/* Mobile: single Contact button immediately before the hamburger */}
        <div className="flex shrink-0 items-center gap-1 md:hidden">
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full bg-leaf-700 px-4 text-sm font-semibold text-white"
          >
            Contact
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-sand text-2xl text-leaf-800"
          >
            {open ? '×' : '☰'}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile navigation" className="border-t border-sand bg-cream px-4 pb-4 md:hidden">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center border-b border-beige text-base font-medium text-stone-700"
            >
              {n.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
