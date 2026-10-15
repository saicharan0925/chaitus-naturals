// Supabase Edge Function: submit-review
// Public customers POST { product_id, reviewer_name, rating, review_text, turnstile_token }.
// The function verifies the Turnstile token server-side (secret key from
// `TURNSTILE_SECRET_KEY` env — set via `supabase secrets set`), validates and
// sanitizes all input, then inserts the review with approved = false.
// Deploy: `supabase functions deploy submit-review`
// Secrets: `supabase secrets set TURNSTILE_SECRET_KEY=your-secret-key`

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function clean(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  // Strip control chars, trim, cap length
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
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

    // --- Insert as pending (approved=false, enforced again by RLS) ----------
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { error } = await supabase.from('reviews').insert({
      product_id,
      reviewer_name,
      rating,
      review_text,
      approved: false,
    });
    if (error) throw new Error('Could not save your review. Please try again.');

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
});
