# Chaitu's Naturals — Handmade Herbal Hair & Skin Care

Next.js (App Router, static export) + Tailwind + Framer Motion storefront, Supabase (Postgres + Auth + Storage) backend, Cloudflare Turnstile review protection, hosted free on Cloudflare Pages at `chaitusnaturals.pages.dev`.

100% free stack: no paid services, no paid plans, no paid domain. No AI/stock imagery — decoration is CSS/SVG only; all product photos are uploaded by the client. All product/marketing text is client-written.

## Project structure

```
app/                  # layout, home page, products/[slug], admin, sitemap, robots, not-found
components/           # Header, Hero, ProductCard, ReviewForm, Contact, Footer, …
lib/                  # supabase client, pricing, whatsapp, sanitize, image-upload
public/               # _headers (security), favicon.svg, og-cover.svg
supabase/schema.sql   # tables, indexes, RLS, storage bucket
supabase/functions/submit-review/index.ts  # Turnstile-verified review Edge Function
.env.example  README.md  CLIENT-GUIDE.md
```

## 1. Local setup

Requirements: Node 18+ and npm.

```bash
npm install
cp .env.example .env.local   # then fill the 3 values below
npm run dev                  # open http://localhost:3000
```

`.env.local` values (all free):

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → `anon public` key (never the `service_role` key) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Dashboard → Turnstile → Add site → copy Site key |

Optional: `NEXT_PUBLIC_SITE_URL` (default `https://chaitusnaturals.pages.dev`), `NEXT_PUBLIC_WHATSAPP_NUMBER` (default `917396457733`).

Build the static site any time with `npm run build` (outputs `./out/`).

## 2. Supabase setup (free tier)

1. Create a free project at supabase.com.
2. **SQL:** open SQL Editor → paste `supabase/schema.sql` → Run. This creates `products`, `product_images`, `headlines`, `reviews`, indexes, RLS policies, and the public `product-photos` storage bucket.
3. **Turn off public sign-ups:** Authentication → Sign In / Up → disable “Allow new users to sign up” (email provider stays ON so the admin can log in).
4. **Create the admin user:** Authentication → Users → Add user → Create new user → enter the shop's email + a strong password → save. (There is exactly one admin; any authenticated user can write, so keep sign-ups off.)
5. **Deploy the Edge Function:**
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set TURNSTILE_SECRET_KEY=your-turnstile-secret-key
   supabase functions deploy submit-review
   ```
   The Turnstile **secret** key comes from the same Cloudflare Turnstile widget page (keep it secret — it never goes in frontend code).

## 3. Cloudflare Turnstile (free CAPTCHA)

1. dash.cloudflare.com → Turnstile → Add site → hostname `chaitusnaturals.pages.dev` (+ `localhost` for testing, optional).
2. Copy the **Site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
3. Copy the **Secret key** → `supabase secrets set TURNSTILE_SECRET_KEY=…` (step 2.5).

## 4. Deploy to Cloudflare Pages (free)

1. Push this folder to a free GitHub repo.
2. Cloudflare Dashboard → Pages → Create → Connect to Git → select the repo.
3. Build settings: Framework preset **Next.js (Static HTML Export)**, Build command `npm run build`, Build output directory `out`, Node version 18+.
4. Environment variables: add the 3 `NEXT_PUBLIC_*` values (same as `.env.local`).
5. Deploy → you get `https://chaitusnaturals.pages.dev`. The `public/_headers` file is copied to `out/_headers` automatically and applies the security headers.

Every `git push` redeploys automatically.

## 5. Optional: custom domain later

Cloudflare Pages → your project → Custom domains → Set up a custom domain → follow the DNS prompts. No code changes needed (optionally update `NEXT_PUBLIC_SITE_URL` to the new domain and redeploy).

## Notes for developers

- `output: 'export'` in `next.config.mjs` — no server, no API routes. All data fetching is client-side via the anon key + RLS.
- `images.unoptimized: true` — required for Cloudflare Pages (no Next Image optimizer).
- Orders store no customer data: the WhatsApp button just opens `wa.me` with a pre-filled message.
- Reviews are inserted with `approved = false` only (RLS + Edge Function enforce this) and appear after admin approval.
- Admin route `/admin` is unlinked from the public site; logged-out visitors see the not-found page.
