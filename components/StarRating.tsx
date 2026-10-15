import type { ReactNode } from 'react';

// Average star rating + approved-review count. Purely presentational.

export default function StarRating({
  avg,
  count,
  size = 16,
}: {
  avg: number;
  count: number;
  size?: number;
}) {
  const stars: ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    const filled = avg >= i - 0.25;
    const half = !filled && avg >= i - 0.75;
    stars.push(
      <span
        key={i}
        aria-hidden="true"
        style={{ color: filled || half ? '#D99A2B' : '#D8CDB8', fontSize: size, lineHeight: 1 }}
      >
        ★
      </span>,
    );
  }
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`Rated ${avg.toFixed(1)} out of 5 from ${count} reviews`}>
      <span className="inline-flex" aria-hidden="true">{stars}</span>
      <span className="text-sm text-stone-600">
        {count > 0 ? `${avg.toFixed(1)} (${count})` : 'No reviews yet'}
      </span>
    </span>
  );
}
