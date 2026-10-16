// WhatsApp mark as inline SVG (no external assets).
// Green circle (#25D366) with a white speech-bubble + handset glyph.
// Explicit width/height/viewBox/fill — does not rely on inherited text color.

export default function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="WhatsApp"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="12" fill="#25D366" stroke="none" />
      {/* Speech bubble */}
      <circle cx="12" cy="11.4" r="6.6" fill="#ffffff" stroke="none" />
      <polygon points="9.2,16.2 7.6,19.4 11.6,18.2" fill="#ffffff" stroke="none" />
      {/* Handset */}
      <path
        d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
        fill="#25D366"
        stroke="none"
        transform="translate(7.7,7.1) scale(0.358)"
      />
    </svg>
  );
}
