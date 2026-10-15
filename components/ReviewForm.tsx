'use client';

// Customer review form: name (≤60), 1–5 star selector, text (≤500),
// hidden honeypot + Cloudflare Turnstile. Saves as pending (approved=false).
// Posts to the Supabase Edge Function `submit-review` (server-verified).

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

export default function ReviewForm({ productId, onSubmitted }: { productId: string; onSubmitted: () => void }) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [honey, setHoney] = useState(''); // honeypot — humans leave it empty
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const cleanName = name.trim().slice(0, 60);
    const cleanText = text.trim().slice(0, 500);
    if (cleanName.length < 1) return setError('Please enter your name.'), setStatus('error');
    if (cleanText.length < 1) return setError('Please write a few words about your experience.'), setStatus('error');
    if (honey !== '') return; // bot — silently drop
    if (siteKey && !tokenRef.current) {
      setStatus('error');
      setError('Please complete the verification check (CAPTCHA).');
      return;
    }
    setStatus('sending');
    try {
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
      onSubmitted();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not send your review.');
    }
  }

  if (status === 'done') {
    return (
      <p role="status" className="rounded-xl bg-leaf-100 p-4 text-leaf-800">
        Thank you! Your review was received and will appear after approval.
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
      {/* Honeypot: hidden from humans, catches bots */}
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
