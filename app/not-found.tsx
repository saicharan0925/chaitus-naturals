import Link from 'next/link';

// Shown for unknown routes AND to logged-out visitors of /admin
// (so the admin login is not discoverable).

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-serif text-4xl font-bold text-leaf-900">Page not found</h1>
      <p className="mt-3 text-stone-600">Sorry, this page does not exist or is no longer available.</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-[44px] items-center rounded-full bg-leaf-700 px-8 py-3 font-semibold text-white"
      >
        Go home
      </Link>
    </div>
  );
}
