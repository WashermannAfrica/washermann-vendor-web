'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, FileCheck, Tags, CheckCircle2, Clock, XCircle, ChevronRight, Download, GraduationCap, Gamepad2, Sparkles, Lock, AlertCircle } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { ApiResponse, VendorProfile } from '@/types';

type VendorDoc = { documentType: string };

const STATUS: Record<string, { tone: string; icon: React.ReactNode; title: string; body: string }> = {
  pending_review: { tone: 'bg-warn-bg text-warn', icon: <Clock size={20} />, title: 'Your business is under review', body: 'Complete the steps below to help us verify you faster. You can keep editing while you wait.' },
  verified: { tone: 'bg-success-bg text-success', icon: <CheckCircle2 size={20} />, title: 'You’re verified 🎉', body: 'Download the Washermann app to start receiving orders. All your details carry over.' },
  rejected: { tone: 'bg-danger-bg text-danger', icon: <XCircle size={20} />, title: 'Application needs changes', body: 'Update your details below and we’ll review again.' },
  suspended: { tone: 'bg-danger-bg text-danger', icon: <XCircle size={20} />, title: 'Account suspended', body: 'Please contact Washermann support.' },
};

function StepCard({ href, icon, title, desc, done, required, statusText, locked, lockedHint, progress }: {
  href: string; icon: React.ReactNode; title: string; desc: string;
  done?: boolean; required?: boolean; statusText?: string;
  locked?: boolean; lockedHint?: string;
  progress?: { priced: number; total: number; pct: number };
}) {
  const showProgress = progress && progress.total > 0 && !done;
  const body = (
    <Card className={`flex items-center gap-4 transition-shadow ${locked ? 'opacity-60' : 'hover:shadow-md'}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${locked ? 'bg-section text-faint' : done ? 'bg-success-bg text-success' : 'bg-mint-soft text-forest'}`}>
        {locked ? <Lock size={18} /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
          {title}
          {done && <CheckCircle2 size={15} className="text-success" />}
          {required && !done && !locked && <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-medium text-warn">Required</span>}
        </p>
        {showProgress ? (
          <div className="mt-1.5">
            <div className="h-2 w-full max-w-xs rounded-full bg-section">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress!.pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-faint">{progress!.priced} of {progress!.total} items priced · {progress!.pct}%{progress!.priced > 0 ? ' — pick up where you left off' : ''}</p>
          </div>
        ) : (
          <p className="text-sm text-body">{locked ? (lockedHint ?? desc) : (statusText ?? desc)}</p>
        )}
      </div>
      {!locked && <ChevronRight size={18} className="text-faint" />}
    </Card>
  );
  if (locked) return <div className="cursor-not-allowed">{body}</div>;
  return <Link href={href}>{body}</Link>;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [docs, setDocs] = useState<VendorDoc[]>([]);
  const [priced, setPriced] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<VendorProfile>>('/vendors/me/profile'),
      api.get<ApiResponse<{ items?: unknown[] }[]>>('/catalogue').catch(() => ({ data: { data: [] } })),
      api.get<ApiResponse<{ items?: unknown[] } | null>>('/vendors/me/pricing').catch(() => ({ data: { data: null } })),
      api.get<ApiResponse<VendorDoc[]>>('/vendors/me/documents').catch(() => ({ data: { data: [] } })),
    ])
      .then(([p, c, pr, d]) => {
        setProfile(p.data.data);
        const cats = Array.isArray(c.data.data) ? c.data.data : [];
        setTotalItems(cats.reduce((n, cat) => n + (cat.items?.length ?? 0), 0));
        setPriced((pr.data.data?.items ?? []).length);
        setDocs(Array.isArray(d.data.data) ? d.data.data : []);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24 text-primary"><Spinner size="lg" /></div>;
  if (error) return <Card className="text-sm text-danger">{error}</Card>;
  if (!profile) return null;

  const profileDone = !!(profile.businessName && profile.phone && profile.areaIds.length);

  // KYC: 4 required sections derived from uploaded document types.
  const has = (t: string) => docs.some((d) => d.documentType === t);
  const kycSections = [has('nin') || has('cac'), has('address_proof'), has('personal_photo'), has('shop_photo')];
  const kycCount = kycSections.filter(Boolean).length;
  const kycDone = kycCount === 4;

  const requiredDone = profileDone && kycDone;       // submitted everything the review needs
  const pricingDone = totalItems > 0 && priced >= totalItems;
  const pricingPct = totalItems ? Math.round((priced / totalItems) * 100) : 0;
  const allSet = profile.verificationStatus === 'verified' || (requiredDone && pricingDone);

  // Banner: only call it "under review" once the required info is actually submitted.
  const vs = profile.verificationStatus;
  const s = vs === 'pending_review' && !requiredDone
    ? { tone: 'bg-warn-bg text-warn', icon: <AlertCircle size={20} />, title: 'Action needed — submit your details',
        body: `You haven't completed verification yet. Submit your business profile and all 4 identity documents (${[profileDone, kycDone].filter(Boolean).length}/2 done) so our team can review you.` }
    : STATUS[vs] ?? STATUS.pending_review;

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
            <StepCard
              href="/onboarding/profile" icon={<Building2 size={20} />} title="Business profile"
              desc="Name, phone and the areas you serve." required done={profileDone}
            />
            <StepCard
              href="/onboarding/documents" icon={<FileCheck size={20} />} title="Identity & verification"
              desc="National ID, proof of address, your photo and shop photos." required done={kycDone}
              statusText={kycDone ? 'All documents submitted ✓' : `${kycCount} of 4 submitted · ${4 - kycCount} left`}
            />
            <StepCard
              href="/onboarding/pricing" icon={<Tags size={20} />} title="Item pricing"
              desc="Set your price for each laundry item." done={pricingDone}
              locked={!requiredDone} lockedHint="Submit your profile & verification documents first to unlock pricing."
              progress={requiredDone ? { priced, total: totalItems, pct: pricingPct } : undefined}
            />
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
