export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex-1 grid place-items-center p-6 text-center">
      <div>
        <div className="text-5xl mb-3">📡</div>
        <h1 className="text-2xl font-bold">You&apos;re offline</h1>
        <p className="text-muted mt-2 max-w-sm mx-auto">
          No connection right now. Pages you&apos;ve already opened still work —
          reconnect to sync and load new data.
        </p>
      </div>
    </main>
  );
}
