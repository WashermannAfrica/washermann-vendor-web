'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, FileCheck, Tags, CheckCircle2, Clock, XCircle, ChevronRight, Download, GraduationCap, Gamepad2, Sparkles } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { ApiResponse, VendorProfile } from '@/types';

const STATUS: Record<string, { tone: string; icon: React.ReactNode; title: string; body: string }> = {
  pending_review: { tone: 'bg-warn-bg text-warn', icon: <Clock size={20} />, title: 'Your business is under review', body: 'Complete the steps below to help us verify you faster. You can keep editing while you wait.' },
  verified: { tone: 'bg-success-bg text-success', icon: <CheckCircle2 size={20} />, title: 'You’re verified 🎉', body: 'Download the Washermann app to start receiving orders. All your details carry over.' },
  rejected: { tone: 'bg-danger-bg text-danger', icon: <XCircle size={20} />, title: 'Application needs changes', body: 'Update your details below and we’ll review again.' },
  suspended: { tone: 'bg-danger-bg text-danger', icon: <XCircle size={20} />, title: 'Account suspended', body: 'Please contact Washermann support.' },
};

function StepCard({ href, icon, title, desc, done, progress }: { href: string; icon: React.ReactNode; title: string; desc: string; done?: boolean; progress?: { priced: number; total: number; pct: number } }) {
  const showProgress = progress && progress.total > 0 && !done;
  return (
    <Link href={href}>
      <Card className="flex items-center gap-4 transition-shadow hover:shadow-md">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${done ? 'bg-success-bg text-success' : 'bg-mint-soft text-forest'}`}>{icon}</span>
        <div className="flex-1">
          <p className="flex items-center gap-2 font-semibold text-ink">{title} {done && <CheckCircle2 size={15} className="text-success" />}</p>
          {showProgress ? (
            <div className="mt-1.5">
              <div className="h-2 w-full max-w-xs rounded-full bg-section">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress!.pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-faint">{progress!.priced} of {progress!.total} items priced · {progress!.pct}%{progress!.priced > 0 ? ' — pick up where you left off' : ''}</p>
            </div>
          ) : (
            <p className="text-sm text-body">{desc}</p>
          )}
        </div>
        <ChevronRight size={18} className="text-faint" />
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [priced, setPriced] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<VendorProfile>>('/vendors/me/profile'),
      api.get<ApiResponse<{ items?: unknown[] }[]>>('/catalogue').catch(() => ({ data: { data: [] } })),
      api.get<ApiResponse<{ items?: unknown[] } | null>>('/vendors/me/pricing').catch(() => ({ data: { data: null } })),
    ])
      .then(([p, c, pr]) => {
        setProfile(p.data.data);
        const cats = Array.isArray(c.data.data) ? c.data.data : [];
        setTotalItems(cats.reduce((n, cat) => n + (cat.items?.length ?? 0), 0));
        setPriced((pr.data.data?.items ?? []).length);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24 text-primary"><Spinner size="lg" /></div>;
  if (error) return <Card className="text-sm text-danger">{error}</Card>;
  if (!profile) return null;

  const s = STATUS[profile.verificationStatus] ?? STATUS.pending_review;
  const profileDone = !!(profile.businessName && profile.phone && profile.areaIds.length);
  const pricingDone = totalItems > 0 && priced >= totalItems;
  const pricingPct = totalItems ? Math.round((priced / totalItems) * 100) : 0;
  const allSet = profile.verificationStatus === 'verified' || (profileDone && pricingDone);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Vendor dashboard</h1>
        <p className="mt-1 text-sm text-body">{profile.businessName ?? 'Your business'}</p>
      </div>

      {/* status banner */}
      <div className={`rounded-2xl p-5 ${s.tone}`}>
        <div className="flex items-start gap-3">
          {s.icon}
          <div>
            <p className="font-semibold">{s.title}</p>
            <p className="mt-0.5 text-sm opacity-90">{s.body}</p>
            {profile.verificationStatus === 'rejected' && profile.rejectionReason && (
              <p className="mt-2 text-sm font-medium">Reason: {profile.rejectionReason}</p>
            )}
          </div>
        </div>
      </div>

      {profile.verificationStatus === 'verified' ? (
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink">Get the app</p>
            <p className="text-sm text-body">Manage orders and go online from your phone.</p>
          </div>
          <a href="https://www.washermann.com" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
            <Download size={16} /> Download
          </a>
        </Card>
      ) : (
        <>
          <p className="text-sm font-semibold text-faint">Complete your onboarding</p>
          <div className="flex flex-col gap-3">
            <StepCard href="/onboarding/profile" icon={<Building2 size={20} />} title="Business profile" desc="Name, phone and the areas you serve." done={profileDone} />
            <StepCard href="/onboarding/documents" icon={<FileCheck size={20} />} title="Verification documents" desc="Upload your ID and business documents." />
            <StepCard href="/onboarding/pricing" icon={<Tags size={20} />} title="Item pricing" desc="Set your price for each laundry item." done={pricingDone} progress={{ priced, total: totalItems, pct: pricingPct }} />
          </div>
        </>
      )}

      {/* Engagement — tutorial + game, unlocked once the vendor is set up */}
      {allSet && (
        <div className="mt-2">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <p className="text-sm font-semibold text-faint">You’re all set — keep us company</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/learn">
              <Card className="group h-full overflow-hidden bg-gradient-to-br from-mint-soft to-white transition-shadow hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-white"><GraduationCap size={20} /></span>
                <p className="mt-3 font-semibold text-ink">Washermann 101</p>
                <p className="mt-0.5 text-sm text-body">A quick interactive tour of how orders, payouts and ratings work.</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-forest">Start the tour <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
              </Card>
            </Link>
            <Link href="/game">
              <Card className="group h-full overflow-hidden bg-gradient-to-br from-violet-bg to-white transition-shadow hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet text-white"><Gamepad2 size={20} /></span>
                <p className="mt-3 font-semibold text-ink">Sud Tap</p>
                <p className="mt-0.5 text-sm text-body">Pop the bubbles, beat the clock, climb the vendor leaderboard.</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet">Play now <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
              </Card>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
