'use client';

// Client logo (public/logo.png, square ~256px). Renders nothing until the file
// exists, so a missing logo never shows a broken image or shifts the layout.

import { useState } from 'react';

export default function Logo({ className = 'h-11 w-11 md:h-[52px] md:w-[52px]' }: { className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    <img
      src="/logo.png"
      alt="Chaitu's Naturals logo"
      width={256}
      height={256}
      onError={() => setMissing(true)}
      className={`shrink-0 rounded-lg object-contain ${className}`}
    />
  );
}
