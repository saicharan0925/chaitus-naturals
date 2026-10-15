// Official Instagram gradient glyph as inline SVG (no external assets).
// Used in header, contact section and footer.

export default function InstagramIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Instagram"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F9CE34" />
          <stop offset="35%" stopColor="#EE2A7B" />
          <stop offset="70%" stopColor="#6228D7" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.5" fill="url(#ig-grad)" />
    </svg>
  );
}
