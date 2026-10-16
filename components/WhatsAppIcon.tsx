// WhatsApp glyph as inline SVG (phone handset; green badge optional).
// No external assets — matches the InstagramIcon approach.

export default function WhatsAppIcon({
  size = 22,
  withBackground = true,
}: {
  size?: number;
  withBackground?: boolean;
}) {
  const s = size;
  const glyph = (
    <path
      d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
      fill="#fff"
      transform={withBackground ? 'translate(3.6,3.6) scale(0.7)' : undefined}
    />
  );
  if (!withBackground) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" role="img" aria-label="WhatsApp" xmlns="http://www.w3.org/2000/svg">
        {glyph}
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" role="img" aria-label="WhatsApp" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      {glyph}
    </svg>
  );
}
