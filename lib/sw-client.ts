"use client";

// Single service-worker registration path. The build id rides in the query
// string, which (a) makes each deploy a new SW script URL so browsers pick it
// up immediately, and (b) lets sw.js derive a per-build cache name — no more
// hand-bumped CACHE constants. updateViaCache:'none' + the no-store header in
// next.config.ts keep the script itself out of HTTP caches.

export function registerSW(): Promise<ServiceWorkerRegistration> {
  const v = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
  return navigator.serviceWorker.register(`/sw.js?v=${v}`, {
    updateViaCache: "none",
  });
}
