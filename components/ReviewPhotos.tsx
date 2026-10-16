'use client';

// Approved-review customer photos: row of small thumbnails.
// Tapping a thumbnail opens it full size in a lightbox.

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';

export default function ReviewPhotos({ urls, productName }: { urls: string[]; productName: string }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!urls || urls.length === 0) return null;
  return (
    <>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Customer photos">
        {urls.map((u, i) => (
          <button
            key={`${u}-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Open customer photo ${i + 1} full size`}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-sand"
          >
            <Image src={u} alt={`Customer photo for ${productName}`} fill sizes="64px" className="object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Customer photo full size"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close photo"
            className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/20 text-2xl text-white"
          >
            ×
          </button>
          <div className="relative h-[80vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={urls[open]}
              alt={`Customer photo for ${productName}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
