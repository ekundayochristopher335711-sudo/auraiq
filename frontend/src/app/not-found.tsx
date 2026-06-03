import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen px-6 py-16 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <div className="glass-panel border-white/60 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">404</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">Page not found</h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              The page you’re looking for doesn’t exist, or it may have been moved. Try returning to the dashboard or explore the app from the home screen.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link href="/" className="inline-flex items-center justify-center rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800">
              Go back home
            </Link>
            <Link href="/subjects" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-7 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white">
              Browse subjects
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
