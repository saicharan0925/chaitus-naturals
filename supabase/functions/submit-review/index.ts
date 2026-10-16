// Supabase Edge Function: submit-review
// Public customers POST review JSON (name, rating, text, Turnstile token,
// honeypot value, consent flag, optional customer photos as data URLs).
// The function:
//   a. verifies the Turnstile token server-side (secret from
//      `TURNSTILE_SECRET_KEY` — set via `supabase secrets set`) and the
//      honeypot field (bots get a fake success, nothing is stored),
//   b. checks each photo's REAL type by magic bytes (not extension) and
//      rejects files over 3 MB or more than 3 files,
//   c. uploads accepted files to the `review-photos` bucket under `pending/`
//      with random UUID names (via service role — server side only, RLS
//      stays strict for browsers),
//   d. inserts the review with approved = false and photo_urls set.
// Deploy: `supabase functions deploy submit-review`
// Secrets: `supabase secrets set TURNSTILE_SECRET_KEY=your-secret-key`

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILES = 3;
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB per photo

function clean(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  // Strip control chars, trim, cap length
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

/** Decode a `data:image/...;base64,...` URL to raw bytes, or null if malformed. */
function dataUrlToBytes(d: unknown): { bytes: Uint8Array; mime: string } | null {
  if (typeof d !== 'string') return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(d.trim());
  if (!m) return null;
  try {
    const bin = atob(m[2].replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, mime: m[1] };
  } catch {
    return null;
  }
}

/** Real file type from magic bytes. JPEG: FF D8 FF. PNG: 89 50 4E 47. WebP: RIFF....WEBP. */
function sniffType(b: Uint8Array): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 3 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (
    b.length > 11 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // "WEBP"
  ) {
    return 'webp';
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // --- Honeypot trap: bots get a fake success, nothing is stored ----------
    if (clean(body.honeypot, 200) !== '') {
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    const product_id = clean(body.product_id, 64);
    const reviewer_name = clean(body.reviewer_name, 60);
    const review_text = clean(body.review_text, 500);
    const rating = Number(body.rating);
    const token = clean(body.turnstile_token, 2048);

    // --- Validate -----------------------------------------------------------
    if (!/^[0-9a-f-]{36}$/i.test(product_id)) throw new Error('Invalid product.');
    if (reviewer_name.length < 1) throw new Error('Please enter your name.');
    if (review_text.length < 1) throw new Error('Please write your experience.');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Invalid rating.');
    if (body.consent !== true) throw new Error('Please agree that your photo may be shown on this website.');

    const photos: unknown[] = Array.isArray(body.photos) ? body.photos : [];
    if (photos.length > MAX_FILES) throw new Error('You can add up to 3 photos.');

    // --- Verify Turnstile (server side, secret never leaves the server) -----
    const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!secret) throw new Error('Review verification is not configured. Please try later.');
    if (!token) throw new Error('Please complete the verification check.');
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const outcome = await verify.json();
    if (!outcome.success) throw new Error('Verification failed. Please try again.');

    // --- Validate photos + upload to pending/ (service role, server only) ----
    // Service role bypasses RLS, so anonymous browsers still cannot write to
    // Storage directly — every byte is checked here first.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const photo_urls: string[] = [];
    for (const p of photos) {
      const parsed = dataUrlToBytes(p);
      if (!parsed) throw new Error('One photo is not a valid image. Please try again.');
      if (parsed.bytes.length > MAX_BYTES) throw new Error('Each photo must be under 3 MB.');
      if (parsed.bytes.length < 32) throw new Error('One photo file looks broken. Please try again.');
      const real = sniffType(parsed.bytes);
      if (!real) throw new Error('Photos must be JPG, PNG or WebP.');
      const path = `pending/${crypto.randomUUID()}.${real === 'jpg' ? 'jpg' : real}`;
      const { error: upErr } = await admin.storage.from('review-photos').upload(path, parsed.bytes, {
        contentType: real === 'jpg' ? 'image/jpeg' : `image/${real}`,
        upsert: false,
      });
      if (upErr) throw new Error('Could not save your photos. Please try again.');
      const { data: pub } = admin.storage.from('review-photos').getPublicUrl(path);
      photo_urls.push(pub.publicUrl);
    }

    // --- Insert as pending (approved=false) ----------------------------------
    const { error } = await admin.from('reviews').insert({
      product_id,
      reviewer_name,
      rating,
      review_text,
      approved: false,
      photo_urls,
    });
    if (error) throw new Error('Could not save your review. Please try again.');

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
});
