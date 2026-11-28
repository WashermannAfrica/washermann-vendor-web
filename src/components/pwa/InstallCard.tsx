'use client';

import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X, Smartphone } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'wm-install-dismissed';

/**
 * "Install the app" nudge, shown inside the authenticated portal so wanting the
 * app is a reason to have an account. On Android/desktop Chromium we use the
 * native beforeinstallprompt; iOS Safari has no prompt API, so we show the
 * Share → Add to Home Screen steps. Hidden once installed or dismissed.
 */
export default function InstallCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hidden until we check

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const ua = navigator.userAgent || '';
    // iPhone/iPod, plus iPadOS (which reports as Mac but has touch points).
    const ios =
      /iphone|ipod/i.test(ua) ||
      (/ipad/i.test(ua) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua)));
    setIsIOS(ios);
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') setInstalled(true);
  }

  if (installed || dismissed) return null;

  // Android / desktop Chromium — native install.
  if (deferred) {
    return (
      <Card className="relative flex items-center gap-4 bg-mint-soft">
        <DismissButton onClick={dismiss} />
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <Smartphone size={20} />
        </span>
        <div className="min-w-0 flex-1 pr-6">
          <p className="font-semibold text-ink">Install the Washermann app</p>
          <p className="text-sm text-body">Add it to your home screen for one-tap access.</p>
        </div>
        <Button type="button" onClick={install} className="shrink-0">
          <Download size={16} /> Install
        </Button>
      </Card>
    );
  }

  // iOS Safari — no prompt API; guide the manual flow.
  if (isIOS) {
    return (
      <Card className="relative bg-mint-soft">
        <DismissButton onClick={dismiss} />
        <div className="flex items-start gap-4 pr-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Smartphone size={20} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Add Washermann to your home screen</p>
            <p className="mt-0.5 text-sm text-body">
              Tap the Share{' '}
              <Share size={14} className="inline -mt-0.5 text-forest" /> button, then{' '}
              <span className="font-medium text-ink">
                Add to Home Screen <SquarePlus size={14} className="inline -mt-0.5" />
              </span>
              .
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Dismiss"
      className="absolute right-3 top-3 text-faint hover:text-ink"
    >
      <X size={16} />
    </button>
  );
}
