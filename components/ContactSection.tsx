'use client';

// Contact section: WhatsApp button + Instagram link.

import InstagramIcon from './InstagramIcon';
import Reveal from './Reveal';

export default function ContactSection() {
  return (
    <section id="contact" aria-labelledby="contact-heading" className="bg-beige/60">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <Reveal>
          <h2 id="contact-heading" className="text-center font-serif text-3xl font-bold text-leaf-900">
            Contact Us
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-stone-600">
            Questions or bulk orders? Message us — we reply personally.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://wa.me/917396457733?text=Hello%20Chaitu%27s%20Naturals%2C%20I%20have%20a%20question."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-full bg-[#1FA855] px-8 py-3 text-base font-semibold text-white transition hover:brightness-95"
            >
              Chat on WhatsApp
            </a>
            <a
              href="https://www.instagram.com/chaitus_naturals"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-bark/30 bg-white px-8 py-3 text-base font-semibold text-bark-dark transition hover:bg-cream"
              aria-label="Follow Chaitu's Naturals on Instagram (opens in new tab)"
            >
              <InstagramIcon size={20} />
              @chaitus_naturals
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
