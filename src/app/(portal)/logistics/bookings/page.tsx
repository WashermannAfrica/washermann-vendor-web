'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, MapPin, Repeat, CreditCard, Copy, Check, ExternalLink, Clock, PackageCheck } from 'lucide-react';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatNaira, formatWP, formatDateTime, cn } from '@/lib/utils';
import { formatNigerianPhone } from '@/lib/phone';
import {
  listMyBookings, createPaymentLink, markReadyToDeliver, FLOW_LABEL, statusLabel, statusTone, isUnpaid, isRoundTripPickup,
  type LogisticsLeg, type PaymentPurpose,
} from '@/lib/logistics';

export default function MyBookingsPage() {
  const [legs, setLegs] = useState<LogisticsLeg[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setLegs(await listMyBookings());
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-body hover:text-ink">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">My bookings</h1>
          <p className="mt-1 text-sm text-body">Pickups and deliveries you’ve requested.</p>
        </div>
        <Link href="/logistics">
          <Button className="shrink-0"><Plus size={16} /> New booking</Button>
        </Link>
      </div>

      <div className="mt-6">
        {error && (
          <Card className="flex items-center justify-between gap-3 text-sm text-danger">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={load}>Retry</Button>
          </Card>
        )}

        {!legs && !error && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-section" />)}
          </div>
        )}

        {legs && legs.length === 0 && !error && (
          <Card className="text-center">
            <p className="text-sm text-body">No bookings yet.</p>
            <Link href="/logistics" className="mt-4 inline-block">
              <Button>Book a pickup or delivery</Button>
            </Link>
          </Card>
        )}

        {legs && legs.length > 0 && (
          <div className="space-y-3">
            {groupTrips(legs).map((group) =>
              group.length > 1
                ? <TripCard key={group[0].id} legs={group} />
                : <BookingCard key={group[0].id} leg={group[0]} reload={load} />,
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Keep newest-first order, but render a round trip's two legs together (pickup first). */
function groupTrips(legs: LogisticsLeg[]): LogisticsLeg[][] {
  const byId = new Map(legs.map((l) => [l.id, l]));
  const childByParent = new Map<string, LogisticsLeg>();
  for (const l of legs) if (l.parentOrderId) childByParent.set(l.parentOrderId, l);

  const out: LogisticsLeg[][] = [];
  const used = new Set<string>();
  for (const l of legs) {
    if (used.has(l.id)) continue;
    // A return leg whose parent is also in the list is rendered under the parent.
    if (l.parentOrderId && byId.has(l.parentOrderId)) continue;
    const child = childByParent.get(l.id);
    if (child) {
      out.push([l, child]);
      used.add(l.id);
      used.add(child.id);
    } else {
      out.push([l]);
      used.add(l.id);
    }
  }
  return out;
}

function Fee({ leg }: { leg: LogisticsLeg }) {
  if (leg.nairaEquivalentSnapshot == null) return <span className="text-faint">Fee to be set</span>;
  return (
    <span className="text-ink">
      <strong>{formatNaira(leg.nairaEquivalentSnapshot)}</strong>
      {leg.totalWP != null && <span className="text-faint"> · {formatWP(leg.totalWP)}</span>}
    </span>
  );
}

function Recipient({ leg }: { leg: LogisticsLeg }) {
  if (!leg.recipient) return null;
  return (
    <div className="flex items-start gap-1.5 text-sm text-body">
      <MapPin size={14} className="mt-0.5 shrink-0 text-faint" />
      <span className="min-w-0">
        <span className="font-medium text-ink">{leg.recipient.name}</span>
        <span className="text-faint"> · {formatNigerianPhone(leg.recipient.phone)}</span>
        <span className="block truncate text-faint">{leg.recipient.address}</span>
      </span>
    </div>
  );
}

function BookingCard({ leg, reload }: { leg: LogisticsLeg; reload: () => void }) {
  const rtPickup = isRoundTripPickup(leg);
  const returnLeg = !!leg.parentOrderId; // a return leg shown without its parent in view
  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-ink">{leg.reference}</span>
        <span className="text-xs text-faint">{FLOW_LABEL[leg.flow]}</span>
        {(rtPickup || returnLeg) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-bg px-2 py-0.5 text-[11px] font-semibold text-violet">
            <Repeat size={11} /> Round trip · {returnLeg ? 'return' : 'pickup'}
          </span>
        )}
        <span className="ml-auto"><Badge tone={statusTone(leg.status)}>{statusLabel(leg.status)}</Badge></span>
      </div>

      <Recipient leg={leg} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-faint">{formatDateTime(leg.scheduledPickupAt)}</span>
        <span className="ml-auto"><Fee leg={leg} /></span>
      </div>

      {rtPickup && <ReadyControl leg={leg} reload={reload} />}

      <PayControls leg={leg} />
    </Card>
  );
}

/** Round-trip pickup with no return leg yet: let the vendor spawn the return
 *  once the laundry is washed. Enabled only after the pickup fee is settled. */
function ReadyControl({ leg, reload }: { leg: LogisticsLeg; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const payable = isUnpaid(leg.status);

  async function markReady() {
    setBusy(true);
    setError('');
    try {
      await markReadyToDeliver(leg.id);
      reload();
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl bg-section px-3 py-2.5">
      <p className="text-xs text-body">
        The return trip (clean laundry back to your customer) is created when you mark this ready.
      </p>
      {!payable && (
        <Button type="button" size="sm" variant="soft" className="mt-2" loading={busy} onClick={markReady}>
          <PackageCheck size={14} /> Mark ready — create return trip
        </Button>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

function TripCard({ legs }: { legs: LogisticsLeg[] }) {
  const [pickup] = legs;
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-bg px-2.5 py-1 text-xs font-semibold text-violet">
          <Repeat size={12} /> Round trip
        </span>
        {pickup.recipient && <span className="truncate text-sm font-semibold text-ink">{pickup.recipient.name}</span>}
      </div>
      <Recipient leg={pickup} />
      <div className="space-y-3 border-t border-line pt-3">
        {legs.map((leg) => (
          <div key={leg.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-xs font-semibold text-ink">{leg.reference}</span>
              <span className="text-xs text-faint">{leg.parentOrderId ? 'Return' : 'Pickup'} · {formatDateTime(leg.scheduledPickupAt)}</span>
              <span className="ml-auto flex items-center gap-2">
                <Fee leg={leg} />
                <Badge tone={statusTone(leg.status)}>{statusLabel(leg.status)}</Badge>
              </span>
            </div>
            <PayControls leg={leg} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Pay action for an unpaid leg. Sponsor ("pay for me") is only offered when the
 *  leg is paid at booking (not on-arrival), matching the backend rule. */
function PayControls({ leg }: { leg: LogisticsLeg }) {
  const [busy, setBusy] = useState<PaymentPurpose | null>(null);
  const [error, setError] = useState('');
  const [selfUrl, setSelfUrl] = useState('');
  const [sponsorUrl, setSponsorUrl] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isUnpaid(leg.status)) return null;
  const sponsorAllowed = leg.paymentTiming !== 'on_arrival';

  async function pay(purpose: PaymentPurpose) {
    setBusy(purpose);
    setError('');
    try {
      const url = await createPaymentLink(leg.id, purpose);
      if (purpose === 'self') {
        setSelfUrl(url); // a fallback link in case the popup is blocked
        if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setSponsorUrl(url);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(sponsorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* link stays visible to copy manually */ }
  }

  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-center gap-2">
        <span className="mr-auto inline-flex items-center gap-1 text-xs text-warn">
          <Clock size={12} /> {leg.paymentTiming === 'on_arrival' ? 'Pay on arrival' : 'Awaiting payment'}
        </span>
        <Button type="button" size="sm" loading={busy === 'self'} onClick={() => pay('self')}>
          <CreditCard size={14} /> Pay{leg.nairaEquivalentSnapshot != null ? ` ${formatNaira(leg.nairaEquivalentSnapshot)}` : ''}
        </Button>
        {sponsorAllowed && (
          <Button type="button" size="sm" variant="soft" loading={busy === 'sponsor'} onClick={() => pay('sponsor')}>
            <Copy size={14} /> Customer link
          </Button>
        )}
      </div>

      {selfUrl && (
        <a href={selfUrl} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline">
          <ExternalLink size={13} /> Payment didn’t open? Click here
        </a>
      )}

      {sponsorUrl && (
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={sponsorUrl} className="h-9 min-w-0 flex-1 rounded-full bg-section px-3 text-xs text-ink" />
          <button type="button" onClick={copy}
            className={cn('inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-medium', copied ? 'bg-success-bg text-success' : 'bg-mint-soft text-forest hover:bg-[#d2f2e4]')}>
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
          <a href={sponsorUrl} target="_blank" rel="noopener noreferrer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-section text-body hover:bg-line" aria-label="Open link">
            <ExternalLink size={14} />
          </a>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
