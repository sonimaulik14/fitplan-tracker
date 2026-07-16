import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 grid place-items-center p-6 text-center">
      <div className="animate-fade-up">
        <div className="font-display text-7xl font-bold text-accent">404</div>
        <h1 className="text-2xl font-bold mt-4">Page not found</h1>
        <p className="text-muted mt-2 max-w-sm mx-auto">
          That page took a rest day. Let&apos;s get you back to training.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
