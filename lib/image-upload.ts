// Browser-side image validation + compression for admin uploads.
// Rules: JPG/PNG/WebP only (verified by magic bytes, not extension),
// max 5 MB each, resized to ~1200px wide (JPEG/WebP quality 0.82).

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 1200;

/** Read magic bytes and return the real mime type, or null if unsupported. */
export async function sniffImageType(file: File): Promise<'image/jpeg' | 'image/png' | 'image/webp' | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image/png';
  // WebP: RIFF .... WEBP
  if (
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function validateImageFile(file: File): string | null {
  if (file.size > MAX_BYTES) return `"${file.name}" is too big (max 5 MB).`;
  return null;
}

/** Downscale to MAX_WIDTH px wide, return a compressed Blob. */
export function compressImage(file: File, realType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not process image.'));
      ctx.drawImage(img, 0, 0, w, h);
      const outType = realType === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image.'))),
        outType,
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" is not a readable image.`));
    };
    img.src = url;
  });
}
