// Minimal output-escaping helper. React already escapes text rendered via JSX,
// so this is only needed when injecting strings into attributes / JSON-LD / URLs.

/** Strip control characters and trim; enforce a max length. */
export function cleanText(input: string, maxLen: number): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, maxLen).trim();
}

/** Build a URL-safe slug from a product name. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || `product-${Date.now()}`
  );
}
