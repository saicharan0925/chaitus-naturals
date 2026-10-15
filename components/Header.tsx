'use client';

// Site header: logo text, nav, Instagram icon, mobile hamburger.
// No admin links on the public site (admin route is unlinked /admin).

import { useState } from 'react';
import InstagramIcon from './InstagramIcon';

const NAV = [
  { href: '#home', label: 'Home' },
  { href: '#products', label: 'Products' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#contact', label: 'Contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <a href="#home" className="font-serif text-xl font-bold text-leaf-800 sm:text-2xl">
          Chaitu&apos;s Naturals
        </a>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="min-h-[44px] inline-flex items-center text-[15px] font-medium text-stone-700 hover:text-leaf-700">
              {n.label}
            </a>
          ))}
          <a
            href="https://www.instagram.com/chaitus_naturals"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chaitu's Naturals on Instagram (opens in new tab)"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <InstagramIcon />
          </a>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <a
            href="https://www.instagram.com/chaitus_naturals"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chaitu's Naturals on Instagram (opens in new tab)"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <InstagramIcon />
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-sand text-2xl text-leaf-800"
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
