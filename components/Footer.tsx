// Footer: brand, Instagram + WhatsApp logo buttons, copyright. No admin links.

import InstagramIcon from './InstagramIcon';
import WhatsAppIcon from './WhatsAppIcon';
import Logo from './Logo';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-leaf-900 text-cream">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center">
        <Logo className="h-14 w-14 rounded-2xl" />
        <p className="font-serif text-2xl font-bold">Chaitu&apos;s Naturals</p>
        <p className="max-w-md text-sm text-cream/80">Handmade herbal hair care, skin care, soaps, lip balms, neem combs &amp; loofah.</p>
        <div className="flex items-center gap-4">
          <a
            href="https://www.instagram.com/chaitus_naturals"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white"
          >
            <InstagramIcon size={24} />
          </a>
          <a
            href="https://wa.me/917396345773?text=Hello%20Chaitu%27s%20Naturals%2C%20I%20have%20a%20question."
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white"
          >
            <WhatsAppIcon size={26} />
          </a>
        </div>
        <p className="text-xs text-cream/70">© {year} Chaitu&apos;s Naturals. All rights reserved.</p>
      </div>
    </footer>
  );
}
