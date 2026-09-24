'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Copy, Check, Share2, Users, ChevronLeft } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { statusTone } from '@/lib/utils';
import type { ApiResponse } from '@/types';

interface ReferralRow {
  id: string;
  status: string;
  referredType: 'customer' | 'vendor';
  rewardAmount: number | null;
  rewardCurrency: 'cash' | 'wp';
  createdAt: string;
  referredName: string | null;
  referredEmail: string | null;
}
interface MyReferrals {
  code: string | null;
  counts: { pending: number; available: number; paid: number };
  payout: { pending: number; available: number; paid: number };
  referrals: ReferralRow[];
}

const wp = (n: number) => `${Math.round(Number(n || 0)).toLocaleString()} WP`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function ReferPage() {
  const [data, setData] = useState<MyReferrals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    api.get<ApiResponse<MyReferrals>>('/referrals/me')
      .then((r) => setData(r.data.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const code = data?.code ?? '';
  const link = typeof window !== 'undefined' && code ? `${window.location.origin}/signup?ref=${encodeURIComponent(code)}` : '';

  async function copy(what: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(what === 'code' ? code : link);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* ignore */ }
  }

  async function share() {
    if (navigator.share && link) {
      try {
        await navigator.share({
          title: 'Join Washermann as a washerman',
          text: `Use my code ${code} to join Washermann as a washerman.`,
          url: link,
        });
      } catch { /* cancelled */ }
    } else {
      copy('link');
    }
  }

  if (loading) return <div className="flex justify-center py-24 text-primary"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-forest">
          <ChevronLeft size={15} /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Refer &amp; earn</h1>
        <p className="mt-1 text-sm text-body">Invite other washermen to Washermann and earn WashPoints when they’re approved.</p>
      </div>

      {error && <Card className="text-sm text-danger">{error}</Card>}

      {/* Invite hero */}
      <Card className="overflow-hidden bg-gradient-to-br from-mint-soft to-white">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest text-white"><Gift size={20} /></span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Your referral code</p>
            <p className="text-sm text-body">Share it with a washerman. You earn WashPoints once they sign up and get approved.</p>
          </div>
        </div>

        {code ? (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="rounded-xl border border-dashed border-forest/40 bg-white px-4 py-2.5 font-mono text-lg font-bold tracking-wider text-forest">{code}</span>
              <Button variant="outline" size="sm" onClick={() => copy('code')}>
                {copied === 'code' ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy code</>}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={share}><Share2 size={15} /> Share invite link</Button>
              <Button variant="outline" size="sm" onClick={() => copy('link')}>
                {copied === 'link' ? <><Check size={15} /> Link copied</> : <><Copy size={15} /> Copy link</>}
              </Button>
            </div>
            {link && <p className="mt-3 break-all text-xs text-faint">{link}</p>}
          </>
        ) : (
          <p className="mt-5 text-sm text-body">Your referral code isn’t ready yet. Please check back shortly.</p>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-faint">Invited</p>
          <p className="mt-1 text-xl font-bold text-ink">{data ? data.counts.pending + data.counts.available + data.counts.paid : 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-faint">Awaiting approval</p>
          <p className="mt-1 text-xl font-bold text-ink">{data?.counts.pending ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-faint">Available to earn</p>
          <p className="mt-1 text-xl font-bold text-forest">{wp(data?.payout.available ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-faint">Paid out</p>
          <p className="mt-1 text-xl font-bold text-ink">{wp(data?.payout.paid ?? 0)}</p>
        </Card>
      </div>

      {/* Referrals list */}
      <div>
        <p className="mb-3 text-sm font-semibold text-faint">Your referrals</p>
        {!data || data.referrals.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-section text-faint"><Users size={20} /></span>
            <p className="text-sm font-medium text-ink">No referrals yet</p>
            <p className="max-w-sm text-sm text-body">Share your code above. When someone signs up with it and gets approved, they’ll show up here.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {data.referrals.map((r) => (
              <Card key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{r.referredName ?? r.referredEmail ?? 'New sign-up'}</p>
                  <p className="text-xs text-faint">{r.referredType === 'vendor' ? 'Washerman' : 'Customer'} · {fmtDate(r.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {r.rewardAmount != null && r.rewardCurrency === 'wp' && (
                    <span className="text-sm font-semibold text-ink">{wp(r.rewardAmount)}</span>
                  )}
                  <Badge tone={statusTone(r.status)}>{r.status.replace('_', ' ')}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
