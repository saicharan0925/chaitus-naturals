-- ============================================================================
-- Chaitu's Naturals — Supabase schema (Postgres + RLS + Storage)
-- Run this in the Supabase SQL editor (or `supabase db push` if using CLI).
-- Order: extensions -> tables -> constraints -> indexes -> RLS -> storage.
-- ============================================================================

-- UUID generator
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

-- Products: only rows with active = true are publicly visible.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  -- URL-friendly unique slug, e.g. 'herbal-hair-oil'. Used for /products/[slug].
  slug text not null unique,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  price integer not null check (price >= 0 and price <= 1000000),
  -- Offer: when has_offer is true AND (offer_ends_at is null or in future),
  -- the storefront shows the discounted price.
  has_offer boolean not null default false,
  offer_kind text not null default 'percent' check (offer_kind in ('percent', 'fixed')),
  offer_value integer not null default 0 check (offer_value >= 0 and offer_value <= 1000000),
  offer_ends_at timestamptz null,
  in_stock boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Product images: up to 5 rows per product. position 0 = main photo.
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null check (char_length(image_url) between 1 and 2000),
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  position integer not null default 0 check (position >= 0 and position < 5),
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

-- Headlines: banner messages. Only the newest currently-active one is shown.
create table if not exists public.headlines (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 500),
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Reviews: anonymous inserts allowed ONLY with approved = false.
-- The admin approves via the dashboard (authenticated), or the Edge Function
-- inserts pending rows after Turnstile verification.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 60),
  rating integer not null check (rating >= 1 and rating <= 5),
  review_text text not null check (char_length(review_text) between 1 and 500),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- HELPER: keep updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- VALIDATION: offer values must make sense
-- ----------------------------------------------------------------------------
-- Percent offers: 1..90 (%). Fixed offers: at least ₹1.
-- (Enforced in app code too; this is defence-in-depth at the DB level.)
create or replace function public.check_offer()
returns trigger language plpgsql as $$
begin
  if new.has_offer then
    if new.offer_kind = 'percent' and (new.offer_value < 1 or new.offer_value > 90) then
      raise exception 'percent offer must be between 1 and 90';
    end if;
    if new.offer_kind = 'fixed' and (new.offer_value < 1 or new.offer_value > new.price) then
      raise exception 'fixed offer must be between 1 and the product price';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_offer on public.products;
create trigger trg_products_offer
  before insert or update on public.products
  for each row execute function public.check_offer();

-- Enforce max 5 images per product (positions 0..4 already constrained).
create or replace function public.check_image_count()
returns trigger language plpgsql as $$
declare
  n integer;
begin
  select count(*) into n from public.product_images where product_id = new.product_id;
  if n >= 5 then
    raise exception 'a product can have at most 5 images';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_image_count on public.product_images;
create trigger trg_image_count
  before insert on public.product_images
  for each row execute function public.check_image_count();

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------
create index if not exists idx_products_active on public.products (active);
create index if not exists idx_products_slug on public.products (slug);
create index if not exists idx_images_product on public.product_images (product_id, position);
create index if not exists idx_headlines_active_dates
  on public.headlines (active, starts_at, ends_at);
create index if not exists idx_reviews_product_approved
  on public.reviews (product_id, approved, created_at desc);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.headlines enable row level security;
alter table public.reviews enable row level security;

-- Clean slate for re-runs
drop policy if exists "public read active products" on public.products;
drop policy if exists "admin full access products" on public.products;
drop policy if exists "public read images of active products" on public.product_images;
drop policy if exists "admin full access images" on public.product_images;
drop policy if exists "public read active headlines" on public.headlines;
drop policy if exists "admin full access headlines" on public.headlines;
drop policy if exists "public read approved reviews" on public.reviews;
drop policy if exists "anon insert pending reviews" on public.reviews;
drop policy if exists "admin full access reviews" on public.reviews;

-- PRODUCTS: anyone can read active products; only logged-in admin can write.
-- (Create exactly ONE admin user in Supabase Auth and disable public sign-ups.
--  Any authenticated user is treated as admin — so never enable sign-ups.)
create policy "public read active products"
  on public.products for select
  to anon, authenticated
  using (active = true);

create policy "admin full access products"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

-- PRODUCT IMAGES: public can read images that belong to active products.
create policy "public read images of active products"
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.active = true
    )
  );

create policy "admin full access images"
  on public.product_images for all
  to authenticated
  using (true)
  with check (true);

-- HEADLINES: public reads active headlines within their date window.
create policy "public read active headlines"
  on public.headlines for select
  to anon, authenticated
  using (
    active = true
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

create policy "admin full access headlines"
  on public.headlines for all
  to authenticated
  using (true)
  with check (true);

-- REVIEWS:
--  * public reads approved reviews of active products,
--  * anonymous users may INSERT only rows with approved = false
--    (they cannot set approved=true, nor update/delete anything).
create policy "public read approved reviews"
  on public.reviews for select
  to anon, authenticated
  using (
    approved = true
    and exists (
      select 1 from public.products p
      where p.id = reviews.product_id and p.active = true
    )
  );

create policy "anon insert pending reviews"
  on public.reviews for insert
  to anon
  with check (approved = false);

create policy "admin full access reviews"
  on public.reviews for all
  to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- STORAGE: product-photos bucket (public read, admin write)
-- Run the storage part in the SQL editor; or create the bucket in
-- Dashboard -> Storage -> New bucket ("product-photos", Public = ON).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do update set public = true;

-- Storage policies (drop first for re-runnable script)
drop policy if exists "public read product photos" on storage.objects;
drop policy if exists "admin upload product photos" on storage.objects;
drop policy if exists "admin delete product photos" on storage.objects;
drop policy if exists "admin update product photos" on storage.objects;

create policy "public read product photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-photos');

-- Authenticated uploads. File-type + size checks happen in the admin UI
-- (magic-byte sniffing + 5 MB limit + browser compression) AND should be
-- mirrored by a Storage policy constraint if your plan supports it.
create policy "admin upload product photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-photos');

create policy "admin update product photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-photos')
  with check (bucket_id = 'product-photos');

create policy "admin delete product photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-photos');
