'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Registers the service worker (production only) and shows a one-tap "refresh"
 * prompt when a new version is waiting. Installed PWAs update automatically on
 * the next load; this prompt just lets an open session pick up a deploy promptly
 * instead of running one launch behind.
 */
export default function PwaProvider() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting);
        }
        registration.addEventListener('updatefound', () => {
          const sw = registration.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            // "installed" with an existing controller == an update is ready.
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(sw);
            }
          });
        });
      })
      .catch(() => {
        /* registration failed — the app still works without the SW */
      });

    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm rounded-2xl bg-forest px-4 py-3 text-white shadow-lg sm:left-auto sm:right-3">
      <div className="flex items-center gap-3">
        <RefreshCw size={18} className="shrink-0" />
        <p className="flex-1 text-sm">A new version is available.</p>
        <button
          type="button"
          onClick={() => waiting.postMessage('SKIP_WAITING')}
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-forest hover:opacity-90"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setWaiting(null)}
          aria-label="Dismiss"
          className="shrink-0 text-white/70 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
