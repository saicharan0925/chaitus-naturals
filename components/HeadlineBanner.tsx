'use client';

// Headline banner: shows the newest currently-active headline, else renders nothing.

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { Headline } from '@/lib/types';

export default function HeadlineBanner() {
  const [headline, setHeadline] = useState<Headline | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb
          .from('headlines')
          .select('*')
          .eq('active', true)
          .lte('starts_at', new Date().toISOString())
          .or('ends_at.is.null,ends_at.gt.' + new Date().toISOString())
          .order('starts_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && data) setHeadline(data as Headline);
      } catch {
        /* banner stays hidden on error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!headline) return null;
  return (
    <div role="status" className="bg-leaf-700 px-4 py-2.5 text-center text-sm font-medium text-cream sm:text-[15px]">
      <span className="font-serif font-bold">{headline.title}</span>
      {headline.message ? <span> — {headline.message}</span> : null}
    </div>
  );
}
