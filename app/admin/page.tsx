'use client';

// Admin panel (/admin) — plain-language, phone-friendly, no code needed.
// Sections: Products, Headlines, Reviews, Password.
// Security: Supabase Auth (email+password). Logged-out visitors see the same
// "not found" page as unknown routes; the login form is revealed via a small
// "Shop owner?" link so the admin URL is not obvious. Auto logout after
// 2 hours without any tap/click/type. Login throttling after failed attempts.

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { getSupabase } from '@/lib/supabase';
import type { Headline, Product, ProductImage, Review } from '@/lib/types';
import { finalPrice } from '@/lib/pricing';
import { cleanText, slugify } from '@/lib/sanitize';
import { compressImage, sniffImageType, validateImageFile } from '@/lib/image-upload';

const INACTIVITY_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000; // 5-minute lockout after MAX_FAILS

type Tab = 'products' | 'headlines' | 'reviews' | 'password';

interface PhotoItem {
  key: string; // local id for drag/drop
  url: string; // uploaded URL or blob preview
  path: string | null; // storage path (for deletion)
  blobUrl?: boolean;
  pendingFile?: File; // newly picked, not yet uploaded
  pendingType?: string;
}

// --- Small plain-language UI helpers ---------------------------------------

function BigButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex min-h-[48px] items-center justify-center rounded-xl px-6 py-3 text-base font-semibold transition disabled:opacity-50 ${className}`}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[15px] font-medium text-stone-700">
      {label}
      {children}
    </label>
  );
}

const inputCls = 'min-h-[48px] rounded-xl border border-sand bg-white px-3 py-2 text-base';

function Toggle({ on, onLabel, offLabel, onChange, label }: { on: boolean; onLabel: string; offLabel: string; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-sand bg-white px-3 py-2">
      <span className="text-[15px] font-medium text-stone-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`min-h-[44px] min-w-[110px] rounded-full px-4 font-semibold ${on ? 'bg-leaf-700 text-white' : 'bg-stone-200 text-stone-600'}`}
      >
        {on ? onLabel : offLabel}
      </button>
    </div>
  );
}

// --- Main page --------------------------------------------------------------

export default function AdminPage() {
  const [session, setSession] = useState<boolean | null>(null); // null = checking
  const [showLogin, setShowLogin] = useState(false);
  const [tab, setTab] = useState<Tab>('products');

  // Session check + inactivity logout
  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => setSession(!!data.session)).catch(() => setSession(false));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(!!s));
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        getSupabase().auth.signOut();
        setSession(false);
      }, INACTIVITY_MS);
    };
    reset();
    const events: (keyof WindowEventMap)[] = ['click', 'keydown', 'touchstart', 'mousemove'];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, []);

  if (session === null) return <p className="px-4 py-20 text-center text-stone-500">Loading…</p>;

  // Logged out: same "not found" page as unknown routes (spec requirement),
  // with a discreet owner entry point.
  if (!session && !showLogin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-serif text-4xl font-bold text-leaf-900">Page not found</h1>
        <p className="mt-3 text-stone-600">Sorry, this page does not exist or is no longer available.</p>
        <a href="/" className="mt-8 inline-flex min-h-[44px] items-center rounded-full bg-leaf-700 px-8 py-3 font-semibold text-white">
          Go home
        </a>
        <p className="mt-10">
          <button type="button" onClick={() => setShowLogin(true)} className="text-xs text-stone-400 underline">
            Shop owner?
          </button>
        </p>
      </div>
    );
  }

  if (!session) return <LoginForm />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold text-leaf-900">Shop Manager</h1>
        <button
          type="button"
          onClick={() => getSupabase().auth.signOut()}
          className="inline-flex min-h-[44px] items-center rounded-xl border border-sand bg-white px-5 font-semibold text-stone-600"
        >
          Log out
        </button>
      </div>
      <p className="mt-1 text-sm text-stone-500">You are logged in. You will be logged out after 2 hours without use.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Manager sections">
        {(
          [
            ['products', 'Products'],
            ['headlines', 'Top banner'],
            ['reviews', 'Reviews'],
            ['password', 'Password'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-[48px] rounded-xl px-3 font-semibold ${tab === t ? 'bg-leaf-700 text-white' : 'border border-sand bg-white text-stone-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === 'products' && <ProductsManager />}
        {tab === 'headlines' && <HeadlinesManager />}
        {tab === 'reviews' && <ReviewsManager />}
        {tab === 'password' && <PasswordChanger />}
      </div>
    </div>
  );
}

// --- Login ------------------------------------------------------------------

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const fails = useRef<{ count: number; lockedUntil: number }>({ count: 0, lockedUntil: 0 });

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (Date.now() < fails.current.lockedUntil) {
      setMsg('Too many wrong tries. Please wait 5 minutes and try again.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch {
      fails.current.count += 1;
      if (fails.current.count >= MAX_FAILS) {
        fails.current = { count: 0, lockedUntil: Date.now() + LOCK_MS };
        setMsg('Too many wrong tries. Please wait 5 minutes and try again.');
      } else {
        setMsg(`Wrong email or password. Try again (${MAX_FAILS - fails.current.count} tries left before a short lock).`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-serif text-3xl font-bold text-leaf-900">Shop login</h1>
      <p className="mt-1 text-sm text-stone-500">Only for the shop owner.</p>
      <form onSubmit={login} className="mt-4 flex flex-col gap-3 rounded-2xl border border-sand bg-white p-5">
        <Field label="Email">
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Password">
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </Field>
        {msg && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
            {msg}
          </p>
        )}
        <BigButton type="submit" disabled={busy} className="bg-leaf-700 text-white">
          {busy ? 'Logging in…' : 'Log in'}
        </BigButton>
      </form>
    </div>
  );
}

// --- Products ---------------------------------------------------------------

const emptyForm = {
  name: '',
  description: '',
  price: '',
  has_offer: false,
  offer_kind: 'percent' as 'percent' | 'fixed',
  offer_value: '',
  offer_ends_at: '',
  in_stock: true,
  active: true,
};

function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const dragKey = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await getSupabase().from('products').select('*').order('created_at', { ascending: false });
    setProducts((data ?? []) as Product[]);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setPhotos([]);
    setMsg('');
    setShowForm(true);
  }

  async function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      has_offer: p.has_offer,
      offer_kind: p.offer_kind,
      offer_value: String(p.offer_value),
      offer_ends_at: p.offer_ends_at ? p.offer_ends_at.slice(0, 16) : '',
      in_stock: p.in_stock,
      active: p.active,
    });
    const { data: imgs } = await getSupabase().from('product_images').select('*').eq('product_id', p.id).order('position');
    setPhotos(
      ((imgs ?? []) as ProductImage[]).map((im) => ({
        key: im.id,
        url: im.image_url,
        path: storagePathFromUrl(im.image_url),
      })),
    );
    setMsg('');
    setShowForm(true);
    window.scrollTo({ top: 0 });
  }

  // New photo files picked
  async function onPickFiles(files: FileList | null) {
    if (!files) return;
    if (photos.length + files.length > 5) {
      setMsg('You can add only 5 photos per product. Remove one first.');
      return;
    }
    for (const file of Array.from(files)) {
      const sizeErr = validateImageFile(file);
      if (sizeErr) {
        setMsg(sizeErr);
        continue;
      }
      const realType = await sniffImageType(file);
      if (!realType) {
        setMsg(`"${file.name}" is not a JPG, PNG or WebP photo.`);
        continue;
      }
      setPhotos((prev) => [
        ...prev,
        { key: `new-${Date.now()}-${Math.random()}`, url: URL.createObjectURL(file), path: null, blobUrl: true, pendingFile: file, pendingType: realType },
      ]);
    }
  }

  function movePhoto(fromKey: string, toKey: string) {
    setPhotos((prev) => {
      const from = prev.findIndex((p) => p.key === fromKey);
      const to = prev.findIndex((p) => p.key === toKey);
      if (from < 0 || to < 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const item = prev.find((p) => p.key === key);
      if (item?.blobUrl) URL.revokeObjectURL(item.url);
      return prev.filter((p) => p.key !== key);
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const name = cleanText(form.name, 120);
    const description = cleanText(form.description, 2000);
    const price = Math.round(Number(form.price));
    if (!name) return setMsg('Please enter a product name.');
    if (!Number.isFinite(price) || price < 0) return setMsg('Please enter a correct price in Rs (numbers only).');
    const has_offer = form.has_offer;
    const offer_kind = form.offer_kind;
    const offer_value = has_offer ? Math.round(Number(form.offer_value)) : 0;
    if (has_offer) {
      if (offer_kind === 'percent' && (!Number.isFinite(offer_value) || offer_value < 1 || offer_value > 90))
        return setMsg('Offer percent must be between 1 and 90.');
      if (offer_kind === 'fixed' && (!Number.isFinite(offer_value) || offer_value < 1 || offer_value > price))
        return setMsg('Offer Rs amount must be between 1 and the product price.');
    }
    if (photos.length === 0) return setMsg('Please add at least 1 photo.');
    setBusy(true);
    try {
      const sb = getSupabase();
      const slug = editingId ? (products.find((p) => p.id === editingId)?.slug ?? slugify(name)) : await uniqueSlug(name);
      const row = {
        slug,
        name,
        description,
        price,
        has_offer,
        offer_kind,
        offer_value,
        offer_ends_at: form.offer_ends_at ? new Date(form.offer_ends_at).toISOString() : null,
        in_stock: form.in_stock,
        active: form.active,
      };
      let productId = editingId;
      if (editingId) {
        const { error } = await sb.from('products').update(row).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from('products').insert(row).select('id').single();
        if (error) throw error;
        productId = (data as { id: string }).id;
      }
      // Upload new files (compressed), keep existing
      const finalUrls: { url: string; path: string | null }[] = [];
      for (const ph of photos) {
        if (ph.pendingFile && ph.pendingType) {
          const blob = await compressImage(ph.pendingFile, ph.pendingType);
          const ext = ph.pendingType === 'image/png' ? 'png' : 'jpg';
          const path = `${productId}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
          const { error: upErr } = await sb.storage.from('product-photos').upload(path, blob, { contentType: ph.pendingType, upsert: false });
          if (upErr) throw upErr;
          const { data: pub } = sb.storage.from('product-photos').getPublicUrl(path);
          finalUrls.push({ url: pub.publicUrl, path });
          if (ph.blobUrl) URL.revokeObjectURL(ph.url);
        } else {
          finalUrls.push({ url: ph.url, path: ph.path });
        }
      }
      // Rewrite image rows in new order (position 0 = main photo)
      await sb.from('product_images').delete().eq('product_id', productId);
      const { error: imgErr } = await sb.from('product_images').insert(
        finalUrls.map((f, i) => ({ product_id: productId, image_url: f.url, alt_text: name, position: i })),
      );
      if (imgErr) throw imgErr;
      setMsg(editingId ? 'Product saved!' : 'New product added!');
      setShowForm(false);
      refresh();
    } catch (err) {
      setMsg(err instanceof Error ? `Could not save: ${err.message}` : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    const { data } = await getSupabase().from('products').select('slug').like('slug', `${base}%`);
    const taken = new Set(((data ?? []) as { slug: string }[]).map((d) => d.slug));
    if (!taken.has(base)) return base;
    let i = 2;
    while (taken.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }

  async function duplicate(p: Product) {
    if (!confirm(`Make a copy of "${p.name}"?`)) return;
    try {
      const sb = getSupabase();
      const { data: imgs } = await sb.from('product_images').select('*').eq('product_id', p.id).order('position');
      const name = `${p.name} (copy)`.slice(0, 120);
      const slug = await uniqueSlug(name);
      const { data, error } = await sb
        .from('products')
        .insert({ ...p, id: undefined, slug, name, created_at: undefined, updated_at: undefined })
        .select('id')
        .single();
      if (error) throw error;
      const newId = (data as { id: string }).id;
      if (imgs && imgs.length) {
        await sb.from('product_images').insert(
          (imgs as ProductImage[]).map((im, i) => ({ product_id: newId, image_url: im.image_url, alt_text: name, position: i })),
        );
      }
      refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not copy.');
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}" forever? This cannot be undone.`)) return;
    try {
      const sb = getSupabase();
      await sb.from('products').delete().eq('id', p.id);
      refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not delete.');
    }
  }

  // Offer preview
  const previewPrice = (() => {
    const price = Math.round(Number(form.price));
    if (!form.has_offer || !Number.isFinite(price)) return null;
    const v = Math.round(Number(form.offer_value));
    if (form.offer_kind === 'percent') {
      if (v < 1 || v > 90) return null;
      return Math.round(price * (1 - v / 100));
    }
    if (v < 1 || v > price) return null;
    return price - v;
  })();

  return (
    <div>
      {!showForm ? (
        <>
          <BigButton onClick={openAdd} className="w-full bg-leaf-700 text-white sm:w-auto">
            + Add product
          </BigButton>
          <ul className="mt-4 flex flex-col gap-3">
            {products.map((p) => (
              <li key={p.id} className={`flex flex-col gap-2 rounded-2xl border border-sand bg-white p-4 ${p.active ? '' : 'opacity-60'}`}>
                <div className="flex items-center justify-between gap-2">
                  <strong className="font-serif text-lg text-leaf-900">{p.name}</strong>
                  <span className="text-sm text-stone-500">₹{p.price}</span>
                </div>
                <p className="text-xs text-stone-500">
                  {p.in_stock ? 'In Stock' : 'Out of Stock'} · {p.active ? 'Visible' : 'Hidden'}
                  {p.has_offer ? ` · Offer: ${p.offer_kind === 'percent' ? p.offer_value + '% off' : '₹' + p.offer_value + ' off'}` : ''}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => openEdit(p)} className="min-h-[44px] rounded-xl bg-beige font-semibold text-bark-dark">
                    Edit
                  </button>
                  <button type="button" onClick={() => duplicate(p)} className="min-h-[44px] rounded-xl bg-beige font-semibold text-bark-dark">
                    Copy
                  </button>
                  <button type="button" onClick={() => remove(p)} className="min-h-[44px] rounded-xl bg-red-50 font-semibold text-red-700">
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {products.length === 0 && <p className="text-stone-500">No products yet. Tap “Add product”.</p>}
          </ul>
        </>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-3 rounded-2xl border border-sand bg-cream p-4">
          <h2 className="font-serif text-2xl font-bold text-leaf-900">{editingId ? 'Edit product' : 'Add product'}</h2>
          <Field label="Product name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} required className={inputCls} placeholder="e.g. Herbal Hair Oil" />
          </Field>
          <Field label="Description (tell customers what it is)">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} rows={4} className={inputCls} />
          </Field>

          {/* Photos */}
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-stone-700">Photos (up to 5 — first photo is the main one, drag to change order)</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((ph) => (
                <div
                  key={ph.key}
                  draggable
                  onDragStart={() => (dragKey.current = ph.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragKey.current && dragKey.current !== ph.key) movePhoto(dragKey.current, ph.key);
                    dragKey.current = null;
                  }}
                  className="relative aspect-square overflow-hidden rounded-xl border border-sand bg-white"
                >
                  <Image src={ph.url} alt="" fill sizes="120px" className="object-cover" unoptimized={ph.blobUrl} />
                  {photos[0]?.key === ph.key && (
                    <span className="absolute left-1 top-1 rounded-full bg-leaf-700 px-2 py-0.5 text-[11px] font-bold text-white">Main</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(ph.key)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full bg-black/60 text-lg text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="flex min-h-[100px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-leaf-300 text-3xl text-leaf-500">
                  +
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => onPickFiles(e.target.files)} />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPhotos((p) => (p.length > 1 ? [...p.slice(1), p[0]] : p))} className="min-h-[44px] rounded-xl bg-beige px-4 text-sm font-semibold text-bark-dark">
                Move first photo to last
              </button>
            </div>
          </div>

          <Field label="Price in Rs (numbers only)">
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="numeric" pattern="[0-9]*" required className={inputCls} placeholder="299" />
          </Field>

          <Toggle label="Offer?" on={form.has_offer} onLabel="Yes" offLabel="No" onChange={(v) => setForm({ ...form, has_offer: v })} />
          {form.has_offer && (
            <div className="flex flex-col gap-2 rounded-xl bg-white p-3">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Offer type">
                {(['percent', 'fixed'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={form.offer_kind === k}
                    onClick={() => setForm({ ...form, offer_kind: k })}
                    className={`min-h-[48px] rounded-xl font-semibold ${form.offer_kind === k ? 'bg-leaf-700 text-white' : 'bg-beige text-bark-dark'}`}
                  >
                    {k === 'percent' ? '% Percent' : '₹ Fixed Rs'}
                  </button>
                ))}
              </div>
              <Field label={form.offer_kind === 'percent' ? 'Offer value (1 to 90 %)' : 'Offer value (Rs off)'}>
                <input value={form.offer_value} onChange={(e) => setForm({ ...form, offer_value: e.target.value })} inputMode="numeric" className={inputCls} placeholder={form.offer_kind === 'percent' ? '15' : '50'} />
              </Field>
              {previewPrice !== null && (
                <p role="status" className="rounded-lg bg-leaf-100 p-2 text-sm font-semibold text-leaf-800">
                  Customer will pay: ₹{previewPrice} (was ₹{form.price})
                </p>
              )}
              <Field label="Offer end date (optional — offer stops after this)">
                <input type="datetime-local" value={form.offer_ends_at} onChange={(e) => setForm({ ...form, offer_ends_at: e.target.value })} className={inputCls} />
              </Field>
            </div>
          )}

          <Toggle label="Stock" on={form.in_stock} onLabel="In Stock" offLabel="Out of Stock" onChange={(v) => setForm({ ...form, in_stock: v })} />
          <Toggle label="Show on website?" on={form.active} onLabel="Show" offLabel="Hide" onChange={(v) => setForm({ ...form, active: v })} />

          {msg && (
            <p role={msg.includes('saved') || msg.includes('added') ? 'status' : 'alert'} className="rounded-lg bg-white p-3 text-sm font-medium text-stone-700">
              {msg}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <BigButton type="button" onClick={() => setShowForm(false)} className="border border-sand bg-white text-stone-600">
              Back
            </BigButton>
            <BigButton type="submit" disabled={busy} className="bg-leaf-700 text-white">
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}
            </BigButton>
          </div>
        </form>
      )}
    </div>
  );
}

function storagePathFromUrl(url: string): string | null {
  const m = url.match(/product-photos\/(.+)$/);
  return m ? m[1] : null;
}

// --- Headlines --------------------------------------------------------------

function HeadlinesManager() {
  const [items, setItems] = useState<Headline[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    const { data } = await getSupabase().from('headlines').select('*').order('starts_at', { ascending: false });
    setItems((data ?? []) as Headline[]);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!cleanText(title, 120) || !cleanText(message, 500)) return setMsg('Please fill title and message.');
    const { error } = await getSupabase().from('headlines').insert({
      title: cleanText(title, 120),
      message: cleanText(message, 500),
      starts_at: starts ? new Date(starts).toISOString() : new Date().toISOString(),
      ends_at: ends ? new Date(ends).toISOString() : null,
      active: true,
    });
    if (error) setMsg(error.message);
    else {
      setTitle('');
      setMessage('');
      setStarts('');
      setEnds('');
      setMsg('Banner added! Only the newest active banner shows on the website.');
      refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="flex flex-col gap-3 rounded-2xl border border-sand bg-cream p-4">
        <h2 className="font-serif text-2xl font-bold text-leaf-900">Add top banner</h2>
        <p className="text-sm text-stone-500">Example: “From 20 Oct to 31 Oct: Festival offer, 15% off all hair oils.”</p>
        <Field label="Title (short)">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required className={inputCls} />
        </Field>
        <Field label="Message">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} required className={inputCls} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Start date">
            <input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} className={inputCls} />
          </Field>
          <Field label="End date (banner hides after this)">
            <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className={inputCls} />
          </Field>
        </div>
        {msg && <p role="status" className="text-sm font-medium text-stone-700">{msg}</p>}
        <BigButton type="submit" className="bg-leaf-700 text-white">Add banner</BigButton>
      </form>
      <ul className="flex flex-col gap-2">
        {items.map((h) => (
          <li key={h.id} className="flex flex-col gap-2 rounded-2xl border border-sand bg-white p-4">
            <strong>{h.title}</strong>
            <span className="text-sm text-stone-600">{h.message}</span>
            <span className="text-xs text-stone-500">{h.active ? 'ON' : 'OFF'} · ends {h.ends_at ? new Date(h.ends_at).toLocaleString() : 'never'}</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={async () => {
                  await getSupabase().from('headlines').update({ active: !h.active }).eq('id', h.id);
                  refresh();
                }}
                className="min-h-[44px] rounded-xl bg-beige font-semibold text-bark-dark"
              >
                {h.active ? 'Turn off' : 'Turn on'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Delete this banner?')) return;
                  await getSupabase().from('headlines').delete().eq('id', h.id);
                  refresh();
                }}
                className="min-h-[44px] rounded-xl bg-red-50 font-semibold text-red-700"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Reviews ----------------------------------------------------------------

function ReviewsManager() {
  const [reviews, setReviews] = useState<(Review & { product_name?: string })[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    const { data } = await sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(200);
    const list = (data ?? []) as Review[];
    const { data: prods } = await sb.from('products').select('id,name');
    const names = new Map(((prods ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
    setReviews(list.map((r) => ({ ...r, product_name: names.get(r.product_id) ?? 'Removed product' })));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const shown = reviews.filter((r) => (filter === 'pending' ? !r.approved : filter === 'approved' ? r.approved : true));

  async function setApproved(id: string, approved: boolean) {
    await getSupabase().from('reviews').update({ approved }).eq('id', id);
    refresh();
  }
  async function del(id: string) {
    if (!confirm('Delete this review forever?')) return;
    await getSupabase().from('reviews').delete().eq('id', id);
    refresh();
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Review filter">
        {(['pending', 'approved', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-[48px] rounded-xl font-semibold capitalize ${filter === f ? 'bg-leaf-700 text-white' : 'border border-sand bg-white text-stone-600'}`}
          >
            {f} ({f === 'pending' ? reviews.filter((r) => !r.approved).length : f === 'approved' ? reviews.filter((r) => r.approved).length : reviews.length})
          </button>
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {shown.map((r) => (
          <li key={r.id} className="rounded-2xl border border-sand bg-white p-4">
            <p className="text-sm text-stone-500">{r.product_name} · {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · {r.reviewer_name}</p>
            <p className="mt-1 text-[15px] text-stone-700">{r.review_text}</p>
            {(r.photo_urls?.length ?? 0) > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Customer photos">
                {(r.photo_urls ?? []).map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${u}-${i}`}
                    src={u}
                    alt={`Customer photo ${i + 1} for ${r.product_name}`}
                    className="h-16 w-16 shrink-0 rounded-lg border border-sand object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setApproved(r.id, true)} className="min-h-[44px] rounded-xl bg-leaf-700 font-semibold text-white">
                Approve
              </button>
              <button type="button" onClick={() => setApproved(r.id, false)} className="min-h-[44px] rounded-xl bg-beige font-semibold text-bark-dark">
                Reject
              </button>
              <button type="button" onClick={() => del(r.id)} className="min-h-[44px] rounded-xl bg-red-50 font-semibold text-red-700">
                Delete
              </button>
            </div>
          </li>
        ))}
        {shown.length === 0 && <p className="text-stone-500">Nothing here. New customer reviews will appear under “Pending”.</p>}
      </ul>
    </div>
  );
}

// --- Password ---------------------------------------------------------------

function PasswordChanger() {
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  async function change(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (pw.length < 8) return setMsg('Please use at least 8 letters/numbers.');
    const { error } = await getSupabase().auth.updateUser({ password: pw });
    setMsg(error ? error.message : 'Password changed!');
    setPw('');
  }
  return (
    <form onSubmit={change} className="flex flex-col gap-3 rounded-2xl border border-sand bg-cream p-4">
      <h2 className="font-serif text-2xl font-bold text-leaf-900">Change password</h2>
      <Field label="New password (at least 8 characters)">
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required autoComplete="new-password" className={inputCls} />
      </Field>
      {msg && <p role="status" className="text-sm font-medium text-stone-700">{msg}</p>}
      <BigButton type="submit" className="bg-leaf-700 text-white">Save new password</BigButton>
    </form>
  );
}
