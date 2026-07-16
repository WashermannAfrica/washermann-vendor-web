'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Gift, Trophy, Sparkles, Lock, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api, apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { formatNaira } from '@/lib/utils';
import type { ApiResponse, CatalogueCategory } from '@/types';

// Front-loaded fill so the first prices feel impactful (sqrt curve), then tapers.
const fill = (raw: number) => Math.round(Math.sqrt(Math.min(1, Math.max(0, raw))) * 100);

const CHECKPOINTS = [
  { at: 0.25, points: 25, title: 'Nice start! 🎁', body: 'You priced a quarter of your items.' },
  { at: 0.5, points: 50, title: 'Halfway there! 🎉', body: 'Your shop is taking shape.' },
  { at: 0.75, points: 100, title: 'Almost done! 🔥', body: 'Just a few more to go.' },
  { at: 1, points: 250, title: 'All items priced! 🏆', body: 'You unlocked the grand prize.', grand: true },
];

function burst(big = false) {
  const base = { spread: big ? 120 : 70, startVelocity: big ? 55 : 40, ticks: big ? 220 : 120, zIndex: 9999 };
  confetti({ ...base, particleCount: big ? 160 : 60, origin: { y: 0.6 } });
  if (big) {
    setTimeout(() => confetti({ ...base, particleCount: 120, angle: 60, origin: { x: 0, y: 0.7 } }), 150);
    setTimeout(() => confetti({ ...base, particleCount: 120, angle: 120, origin: { x: 1, y: 0.7 } }), 300);
  }
}

export default function PricingPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [slugById, setSlugById] = useState<Record<string, string>>({});
  const [statusById, setStatusById] = useState<Record<string, 'approved' | 'rejected' | 'pending'>>({});
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  // Latest proposal lifecycle: has the vendor submitted, and has admin finished reviewing it.
  const [submitted, setSubmitted] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ title: string; body: string; points: number } | null>(null);
  const [grand, setGrand] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCat(catId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  }
  const celebrated = useRef<Set<number>>(new Set());

  function goBack() {
    if (dirty) setLeaveOpen(true);
    else router.push('/dashboard');
  }

  const total = categories.reduce((n, c) => n + (c.items?.length ?? 0), 0);
  const priced = Object.values(prices).filter((v) => Number(v) > 0).length;
  const approvedCount = Object.values(statusById).filter((s) => s === 'approved').length;
  const rejectedCount = Object.values(statusById).filter((s) => s === 'rejected').length;
  const raw = total ? priced / total : 0;
  const loyalty = CHECKPOINTS.filter((c) => raw >= c.at).reduce((s, c) => s + c.points, 0);

  // Always-visible overall status of the submitted price sheet.
  const overall: { tone: 'neutral' | 'info' | 'warn' | 'danger' | 'success'; title: string; body: string } = !submitted
    ? { tone: 'neutral', title: 'Not submitted yet', body: 'Set your prices and tap Save to send them to the Washermann team for review.' }
    : !finalized
      ? { tone: 'info', title: 'Pending review', body: 'Your prices have been submitted and are awaiting review. You can keep editing until they’re reviewed.' }
      : rejectedCount > 0 && approvedCount > 0
        ? { tone: 'warn', title: `Partially approved — ${rejectedCount} need updating`, body: `${approvedCount} approved (live & locked), ${rejectedCount} need changes. Update the highlighted ones and save again.` }
        : rejectedCount > 0
          ? { tone: 'danger', title: 'Changes needed', body: 'None of your prices were approved. Update them below and save again.' }
          : { tone: 'success', title: 'All approved', body: 'Every price has been approved and is now live for new orders.' };

  const TONE: Record<typeof overall.tone, string> = {
    neutral: 'border-line bg-section text-body',
    info: 'border-info/30 bg-info-bg text-info',
    warn: 'border-warn/30 bg-warn-bg text-warn',
    danger: 'border-danger/30 bg-danger-bg text-danger',
    success: 'border-success/30 bg-success-bg text-success',
  };

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<CatalogueCategory[]>>('/catalogue'),
      api.get<ApiResponse<{ items?: { itemId: string; priceNaira: number; status?: 'approved' | 'rejected' | 'pending'; rejectionReason?: string | null }[]; approvedAt?: string | null; rejectedAt?: string | null } | null>>('/vendors/me/pricing').catch(() => ({ data: { data: null } })),
    ])
      .then(([c, p]) => {
        const cats = Array.isArray(c.data.data) ? c.data.data : [];
        setCategories(cats);
        const smap: Record<string, string> = {};
        cats.forEach((cat) => cat.items?.forEach((i) => { smap[i.id] = i.slug; }));
        setSlugById(smap);
        const proposal = p.data.data;
        const existing = proposal?.items ?? [];
        // A proposal is "finalized" only when admin confirmed the review. Until then,
        // staged decisions stay invisible — the vendor sees everything as pending.
        const isFinalized = !!(proposal?.approvedAt || proposal?.rejectedAt);
        setSubmitted(existing.length > 0);
        setFinalized(isFinalized);
        const pre: Record<string, string> = {};
        const st: Record<string, 'approved' | 'rejected' | 'pending'> = {};
        const rs: Record<string, string> = {};
        existing.forEach((it) => {
          if (!it.itemId) return;
          pre[it.itemId] = String(it.priceNaira);
          if (isFinalized && it.status) st[it.itemId] = it.status;
          if (isFinalized && it.rejectionReason) rs[it.itemId] = it.rejectionReason;
        });
        setPrices(pre);
        setStatusById(st);
        setReasonById(rs);
        // Mark already-passed checkpoints as celebrated so re-login doesn't re-fire them.
        const t = cats.reduce((n, cat) => n + (cat.items?.length ?? 0), 0);
        const r0 = t ? Object.values(pre).filter((v) => Number(v) > 0).length / t : 0;
        CHECKPOINTS.forEach((cp, i) => { if (r0 >= cp.at) celebrated.current.add(i); });
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function setPrice(id: string, val: string) {
    if (statusById[id] === 'approved') return; // approved prices are locked
    const v = val.replace(/[^\d.]/g, '');
    setDirty(true);
    setPrices((prev) => {
      const next = { ...prev, [id]: v };
      // celebrate any newly-crossed checkpoint
      const p = Object.values(next).filter((x) => Number(x) > 0).length;
      const r = total ? p / total : 0;
      CHECKPOINTS.forEach((cp, i) => {
        if (r >= cp.at && !celebrated.current.has(i)) {
          celebrated.current.add(i);
          if (cp.grand) { burst(true); setGrand(true); }
          else { burst(false); setToast({ title: cp.title, body: cp.body, points: cp.points }); setTimeout(() => setToast(null), 3200); }
        }
      });
      return next;
    });
  }

  async function submit(redirect = true) {
    // Never resend approved (locked) lines — they cannot change.
    const entered = Object.entries(prices).filter(([id, v]) => Number(v) > 0 && statusById[id] !== 'approved');
    if (entered.length === 0) { setError('Set a price for at least one item that needs it.'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post('/vendors/me/pricing', {
        items: entered.map(([itemId, v]) => ({ itemId, garmentType: slugById[itemId] ?? itemId, priceNaira: Number(v) })),
      });
      setDirty(false);
      if (redirect) router.push('/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-24 text-primary"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <button onClick={goBack} className="mb-4 flex items-center gap-1.5 text-sm text-body hover:text-ink">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Item pricing</h1>
      <p className="mt-1 text-sm text-body">Set your price for the items you handle. Hit the milestones to earn loyalty points — price everything for the grand prize.</p>

      {/* progress */}
      <div className="sticky top-16 z-20 mt-5 rounded-2xl border border-line bg-white/95 p-4 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">{priced} of {total} items priced</span>
          <span className="flex items-center gap-1 text-forest"><Sparkles size={14} /> {loyalty} loyalty pts</span>
        </div>
        <div className="relative mt-2 h-3 rounded-full bg-section">
          <div className="h-3 rounded-full bg-primary transition-all duration-500" style={{ width: `${fill(raw)}%` }} />
          {CHECKPOINTS.map((cp, i) => (
            <span
              key={i}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${raw >= cp.at ? 'text-warn' : 'text-faint'}`}
              style={{ left: `${fill(cp.at)}%` }}
              title={`${cp.at * 100}% · +${cp.points} pts`}
            >
              {cp.grand ? <Trophy size={15} /> : <Gift size={13} />}
            </span>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {/* Always-on pricing-set status */}
      <div className={`mt-4 rounded-2xl border p-4 ${TONE[overall.tone]}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{overall.title}</p>
          {submitted && finalized && (
            <span className="shrink-0 text-xs font-medium opacity-90">{approvedCount} approved · {rejectedCount} rejected</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-body">{overall.body}</p>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {categories.map((cat) => {
          const items = cat.items ?? [];
          const open = !collapsed.has(cat.id);
          const catPriced = items.filter((i) => Number(prices[i.id]) > 0).length;
          const catDone = items.length > 0 && catPriced >= items.length;
          return (
          <Card key={cat.id} className="p-0 overflow-hidden">
            <button type="button" onClick={() => toggleCat(cat.id)} className="flex w-full items-center justify-between gap-3 p-6 text-left">
              <span className="flex items-center gap-2 font-semibold text-ink">
                <ChevronDown size={16} className={`text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
                {cat.name}
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${catDone ? 'bg-success-bg text-success' : 'bg-section text-faint'}`}>
                {catDone ? <span className="inline-flex items-center gap-1"><Check size={12} /> {items.length} priced</span> : `${catPriced}/${items.length} priced`}
              </span>
            </button>
            {open && (
            <div className="divide-y divide-line px-6 pb-6">
              {items.map((item) => {
                const has = Number(prices[item.id]) > 0;
                const st = statusById[item.id];
                const locked = st === 'approved';
                const rejected = st === 'rejected';
                return (
                  <div key={item.id} className={`flex items-center justify-between gap-4 py-2.5 ${rejected ? '-mx-2 rounded-xl bg-danger-bg/40 px-2' : ''}`}>
                    <div className="flex items-center gap-2">
                      {locked ? <Lock size={13} className="text-success" /> : has && <Check size={14} className="text-success" />}
                      <div>
                        <p className="text-sm font-medium text-ink">{item.name}</p>
                        {locked && <p className="text-xs font-medium text-success">Approved · locked</p>}
                        {rejected && <p className="text-xs text-danger">Not approved{reasonById[item.id] ? ` — ${reasonById[item.id]}` : ''}. Please update.</p>}
                        {!locked && !rejected && item.priceNgn != null && item.priceNgn > 0 && <p className="text-xs text-faint">Platform: {formatNaira(item.priceNgn)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-faint">₦</span>
                      <input
                        inputMode="decimal" placeholder="0" value={prices[item.id] ?? ''} disabled={locked}
                        onChange={(e) => setPrice(item.id, e.target.value)}
                        className={`h-10 w-28 rounded-full px-4 text-sm focus:outline-none focus:ring-2 ${locked ? 'cursor-not-allowed bg-section/60 text-faint' : rejected ? 'bg-white text-ink ring-1 ring-danger/40 focus:ring-danger/40' : 'bg-section text-ink placeholder:text-faint focus:ring-primary/40'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </Card>
          );
        })}
      </div>

      {/* sticky save */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-3">
          <span className="text-sm text-body">{priced} priced · {loyalty} pts</span>
          <Button size="lg" loading={saving} onClick={() => submit(true)}>Save pricing</Button>
        </div>
      </div>

      {/* checkpoint toast */}
      {toast && (
        <div className="fixed left-1/2 top-24 z-[60] -translate-x-1/2 animate-[fadeIn_.2s_ease] rounded-2xl bg-forest-deep px-5 py-3 text-center text-white shadow-xl">
          <p className="font-bold">{toast.title}</p>
          <p className="text-sm text-white/80">{toast.body}</p>
          <p className="mt-1 text-sm font-semibold text-mint">+{toast.points} loyalty points</p>
        </div>
      )}

      {/* grand prize */}
      {grand && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mint-soft text-forest"><Trophy size={30} /></span>
            <h2 className="text-2xl font-bold text-ink">Congratulations! 🎉</h2>
            <p className="mt-2 text-[15px] text-body">You priced every item. Thank you for setting up your shop so thoroughly.</p>
            <div className="mt-5 rounded-2xl bg-mint-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-forest/60">Grand prize</p>
              <p className="mt-1 text-lg font-bold text-forest">+250 loyalty points & a loyalty-tier boost</p>
            </div>
            <Button size="lg" className="mt-6 w-full" loading={saving} onClick={() => submit(true)}>Submit & finish</Button>
          </div>
        </div>
      )}

      {/* leave without saving */}
      {leaveOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setLeaveOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ink">Leave without saving?</h3>
            <p className="mt-2 text-sm text-body">You have unsaved prices. If you leave now, your latest changes won’t be kept.</p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setLeaveOpen(false)}>Keep editing</Button>
              <Button variant="danger" className="flex-1" onClick={() => router.push('/dashboard')}>Leave</Button>
            </div>
            <button onClick={async () => { setLeaveOpen(false); await submit(true); }} className="mt-3 text-sm font-semibold text-primary hover:underline">
              Save &amp; leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
