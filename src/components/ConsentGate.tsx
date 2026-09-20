'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { policyUrl } from '@/lib/policies';

interface PendingPolicy {
  key: string;
  title: string;
  versionNumber: number;
  effectiveDate: string;
  requiresReconsent: boolean;
  reason: 'new' | 'updated';
}

/**
 * Blocks the portal until the vendor has accepted the current version of every
 * policy that applies to them. Also drives re-consent when a new version is
 * published. Fail-open: if the consent API is unavailable it never blocks access.
 */
export default function ConsentGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const [pending, setPending] = useState<PendingPolicy[]>([]);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    let active = true;
    api
      .get<{ data: PendingPolicy[] }>('/policies/consent/pending')
      .then((res) => { if (active) setPending(res.data.data ?? []); })
      .catch(() => { if (active) setPending([]); }) // fail-open
      .finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [hasHydrated, isAuthenticated]);

  if (!checked || pending.length === 0) return null;

  const anyUpdated = pending.some((p) => p.reason === 'updated');

  async function accept() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/policies/consent/accept', {
        keys: pending.map((p) => p.key),
        method: anyUpdated ? 'reconsent' : 'onboarding',
      });
      setPending([]);
    } catch {
      setError('Could not record your acceptance. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mint-soft text-primary">
          <ShieldCheck size={20} />
        </div>
        <h2 className="text-lg font-bold text-ink">
          {anyUpdated ? 'We’ve updated our terms' : 'Please review our terms'}
        </h2>
        <p className="mt-1.5 text-sm text-body">
          To continue using Washermann, please review and accept the following:
        </p>

        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {pending.map((p) => (
            <li key={p.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{p.title}</span>
                <span className="text-xs text-faint">
                  v{p.versionNumber}{p.reason === 'updated' ? ' · updated' : ''}
                </span>
              </span>
              <a
                href={policyUrl(p.key)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Read <ExternalLink size={13} />
              </a>
            </li>
          ))}
        </ul>

        {error && <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

        <button
          onClick={accept}
          disabled={submitting}
          className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'I agree and continue'}
        </button>
        <button
          onClick={() => { logout(); router.replace('/login'); }}
          className="mt-2 w-full py-1.5 text-center text-xs text-faint hover:text-body"
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
