'use client';

// Customer review form: name (≤60), 1–5 star selector, text (≤500),
// OPTIONAL customer photos (up to 3, JPG/PNG/WebP, ≤3 MB each after browser
// compression to ~1200px wide) + required photo-consent checkbox.
// Hidden honeypot + Cloudflare Turnstile. Photos travel WITH the review JSON
// to the Edge Function (never direct browser-to-Storage uploads); the function
// verifies type/size server-side and stores them under pending/.
// Saved as pending (approved=false); thank-you notes the manual check.

import { useEffect, useRef, useState } from 'react';
import { compressImage, sniffImageType } from '@/lib/image-upload';

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3 MB each, measured AFTER compression

interface PendingPhoto {
  key: string;
  url: string; // blob preview for the thumbnail
  blob: Blob;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Could not read photo.'));
    r.readAsDataURL(blob);
  });
}

export default function ReviewForm({ productId, onSubmitted }: { productId: string; onSubmitted: () => void }) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [honey, setHoney] = useState(''); // honeypot — humans leave it empty; server double-checks
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const tokenRef = useRef<string>('');

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  // Load Turnstile script once
  useEffect(() => {
    if (!siteKey) return;
    if (document.getElementById('cf-turnstile-script')) return;
    const s = document.createElement('script');
    s.id = 'cf-turnstile-script';
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      if (widgetRef.current && window.turnstile && widgetId.current === null) {
        widgetId.current = window.turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          callback: (t: string) => {
            tokenRef.current = t;
          },
        });
      }
    };
    document.head.appendChild(s);
  }, [siteKey]);

  // Optional customer photos: validate real type, compress to ~1200px, cap 3 MB
  async function onPickPhotos(files: FileList | null) {
    if (!files) return;
    setError('');
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setStatus('error');
      setError('You can add up to 3 photos.');
      return;
    }
    for (const file of Array.from(files).slice(0, room)) {
      const realType = await sniffImageType(file);
      if (!realType) {
        setStatus('error');
        setError(`"${file.name}" is not a JPG, PNG or WebP photo.`);
        continue;
      }
      let blob = await compressImage(file, realType, 0.8);
      if (blob.size > MAX_PHOTO_BYTES) blob = await compressImage(file, realType, 0.6);
      if (blob.size > MAX_PHOTO_BYTES) {
        setStatus('error');
        setError(`"${file.name}" is still over 3 MB after compression. Please choose a smaller photo.`);
        continue;
      }
      const item: PendingPhoto = {
        key: `${Date.now()}-${Math.random()}`,
        url: URL.createObjectURL(blob),
        blob,
      };
      setPhotos((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, item]));
    }
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const item = prev.find((p) => p.key === key);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((p) => p.key !== key);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const cleanName = name.trim().slice(0, 60);
    const cleanText = text.trim().slice(0, 500);
    if (cleanName.length < 1) return setError('Please enter your name.'), setStatus('error');
    if (cleanText.length < 1) return setError('Please write a few words about your experience.'), setStatus('error');
    if (!consent) return setError('Please tick the box to allow showing your photo on this website.'), setStatus('error');
    if (siteKey && !tokenRef.current) {
      setStatus('error');
      setError('Please complete the verification check (CAPTCHA).');
      return;
    }
    setStatus('sending');
    try {
      const photoDataUrls = await Promise.all(photos.map((p) => blobToDataUrl(p.blob)));
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-review`;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          // Supabase Edge Functions enforce JWT verification by default —
          // the anon key as a Bearer token satisfies it (RLS still applies).
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          product_id: productId,
          reviewer_name: cleanName,
          rating,
          review_text: cleanText,
          turnstile_token: tokenRef.current,
          honeypot: honey,
          consent: true,
          photos: photoDataUrls,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Could not send your review. Please try again.');
      }
      setStatus('done');
      setName('');
      setText('');
      setRating(5);
      setConsent(false);
      setPhotos([]);
      onSubmitted();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not send your review.');
    }
  }

  if (status === 'done') {
    return (
      <p role="status" className="rounded-xl bg-leaf-100 p-4 text-leaf-800">
        Thank you! Your review was received and will appear after we check it.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-sand bg-white p-4 sm:p-5">
      <h3 className="font-serif text-xl font-bold text-leaf-900">Write a review</h3>
      <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
        Your name (max 60 letters)
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
          autoComplete="name"
          className="min-h-[44px] rounded-lg border border-sand bg-cream px-3 py-2 text-base"
          placeholder="e.g. Priya"
        />
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-stone-700">Your rating</legend>
        <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => setRating(n)}
              className="min-h-[44px] min-w-[44px] text-3xl"
              style={{ color: n <= rating ? '#D99A2B' : '#D8CDB8' }}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm font-medium text-stone-700">
        Your experience (max 500 letters)
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          required
          rows={4}
          className="rounded-lg border border-sand bg-cream px-3 py-2 text-base"
          placeholder="What did you like about this product?"
        />
      </label>
      <p className="text-xs text-stone-500">{text.length}/500</p>

      {/* Optional customer photos */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-stone-700">Your photos (optional, up to 3)</span>
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.key} className="relative h-16 w-16 overflow-hidden rounded-lg border border-sand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Your review photo preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(p.key)}
                aria-label="Remove photo"
                className="absolute -right-1 -top-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/65 text-xl leading-none text-white"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex h-16 min-h-[44px] w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-leaf-300 text-2xl text-leaf-500">
              +
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => onPickPhotos(e.target.files)} />
            </label>
          )}
        </div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            className="mt-1 h-5 w-5 shrink-0 accent-leaf-700"
          />
          I agree that my photo may be shown on this website.
        </label>
      </div>

      {/* Honeypot: hidden from humans, catches bots (server double-checks) */}
      <input
        type="text"
        value={honey}
        onChange={(e) => setHoney(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        placeholder="Leave empty"
      />
      {siteKey ? (
        <div ref={widgetRef} />
      ) : (
        <p className="text-xs text-amber-700">Verification key not configured — reviews are paused. Please contact the shop.</p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-leaf-700 px-6 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Submit review'}
      </button>
      <p className="text-xs text-stone-500">Reviews appear publicly only after the shop approves them.</p>
    </form>
  );
}
