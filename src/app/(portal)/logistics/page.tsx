'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, PackageCheck, Shirt, Repeat, Check, Copy, ExternalLink,
  Clock, CreditCard, Wallet, Info, AlertCircle, MapPin,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { cn, formatNaira } from '@/lib/utils';
import { normalizeNigerianPhone, isValidNigerianPhone } from '@/lib/phone';
import { AddressSearch, type SelectedAddress } from '@/components/logistics/AddressSearch';
import {
  createBooking, createPaymentLink, CHOICE_LABEL,
  type BookingChoice, type CreatedLeg, type PaymentTiming, type PaymentPurpose,
} from '@/lib/logistics';

// The vendor profile fields this page needs (from GET /vendors/me/profile).
interface VendorProfileFull {
  id: string;
  businessName: string | null;
  phone: string | null;
  verificationStatus: string;
  latitude: number | null;
  longitude: number | null;
}

const SERVICES: { value: BookingChoice; title: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'pickup', title: 'Pick up dirty laundry', desc: 'From your customer, brought to your shop.', icon: <PackageCheck size={20} /> },
  { value: 'delivery', title: 'Deliver clean laundry', desc: 'From your shop, delivered to your customer.', icon: <Shirt size={20} /> },
  { value: 'round_trip', title: 'Round trip', desc: 'We collect from your customer now, and bring it back clean later.', icon: <Repeat size={20} /> },
];

/** "2026-11-24" + "10:30" (Lagos) → ISO with WAT offset. */
function toLagosIso(date: string, time: string): string {
  return `${date}T${time || '09:00'}:00+01:00`;
}

function lagosToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export default function LogisticsBookingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<VendorProfileFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api
      .get<{ data: VendorProfileFull }>('/vendors/me/profile')
      .then((r) => setProfile(r.data.data))
      .catch((err) => setLoadError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24 text-primary"><Spinner size="lg" /></div>;

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl">
        <BackLink />
        <Card className="text-sm text-danger">{loadError}</Card>
      </div>
    );
  }
  if (!profile) return null;

  const verified = profile.verificationStatus === 'verified';
  const hasLocation = profile.latitude != null && profile.longitude != null;

  // A shop location is the ONE hard requirement — it anchors pricing and routing.
  // Verification (and pricing) are non-blocking onboarding tasks: an unverified
  // vendor can already book (the API allows own-bookings without verification);
  // we surface the pending tasks as a banner rather than a gate.
  if (!hasLocation) {
    return <SetShopLocation onSaved={(lat, lng) => setProfile({ ...profile, latitude: lat, longitude: lng })} />;
  }

  return (
    <BookingForm
      profile={profile}
      verified={verified}
      onBookings={() => router.push('/logistics/bookings')}
    />
  );
}

// ─── Guards ───────────────────────────────────────────────────────────────────

function BackLink() {
  return (
    <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-body hover:text-ink">
      <ArrowLeft size={16} /> Back to dashboard
    </Link>
  );
}

/** Non-blocking reminder shown above the booking form while a vendor is unverified. */
function VerificationPendingBanner() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-warn-bg/60 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warn-bg text-warn">
        <AlertCircle size={18} />
      </span>
      <div className="text-sm">
        <p className="font-semibold text-ink">You can book now — finish setup when you can</p>
        <p className="mt-0.5 text-body">
          Your business is still being verified. Bookings work today; verification unlocks payouts,
          receiving customer orders and your own pricing.
        </p>
        <Link href="/dashboard" className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-forest">
          Finish onboarding <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function SetShopLocation({ onSaved }: { onSaved: (lat: number, lng: number) => void }) {
  const [addr, setAddr] = useState<SelectedAddress | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!addr) {
      setError('Search and pick your shop location first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.patch('/vendors/me/location', { latitude: addr.latitude, longitude: addr.longitude });
      onSaved(addr.latitude, addr.longitude);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <BackLink />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Set your shop location</h1>
      <p className="mt-1 text-sm text-body">
        We need your shop’s location to price and route pickups and deliveries. Set it once — it’s
        saved to your profile.
      </p>
      <Card className="mt-6 space-y-4">
        <div className="flex items-start gap-2.5 rounded-2xl bg-info-bg px-4 py-3 text-sm text-info">
          <MapPin size={16} className="mt-0.5 shrink-0" />
          <span>Search for your shop’s street, area or a nearby landmark and pick the closest match.</span>
        </div>
        <AddressSearch label="Shop location" required value={addr} onChange={setAddr} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button size="lg" className="w-full" loading={saving} onClick={save}>Save shop location</Button>
      </Card>
    </div>
  );
}

// ─── Booking form ───────────────────────────────────────────────────────────

interface FormErrors {
  service?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
}

function BookingForm({ profile, verified, onBookings }: { profile: VendorProfileFull; verified: boolean; onBookings: () => void }) {
  const [choice, setChoice] = useState<BookingChoice | ''>('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<SelectedAddress | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [timing, setTiming] = useState<PaymentTiming>('on_creation');
  const [purpose, setPurpose] = useState<PaymentPurpose>('self');

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<{ leg: CreatedLeg; paymentUrl: string | null; purpose: PaymentPurpose } | null>(null);
  const inFlight = useRef(false);

  const today = useMemo(() => lagosToday(), []);
  const proximity = { latitude: profile.latitude!, longitude: profile.longitude! };

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!choice) e.service = 'Choose what you need.';
    if (!name.trim()) e.recipientName = "Enter the customer's name.";
    if (!isValidNigerianPhone(phone)) e.recipientPhone = 'Enter a valid Nigerian mobile number.';
    if (!address) e.recipientAddress = 'Search and pick the address so we have the exact location.';
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setSubmitError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const normalizedPhone = normalizeNigerianPhone(phone)!;
    const effectivePurpose: PaymentPurpose = timing === 'on_arrival' ? 'self' : purpose;

    inFlight.current = true;
    setSubmitting(true);
    try {
      const leg = await createBooking(choice as BookingChoice, {
        vendorId: profile.id,
        recipient: {
          name: name.trim(),
          phone: normalizedPhone,
          address: address!.address,
          latitude: address!.latitude,
          longitude: address!.longitude,
        },
        scheduledPickupAt: date ? toLagosIso(date, time) : undefined,
        note: note.trim() || undefined,
        paymentTiming: timing,
      });

      // Pay now: create the link immediately. Self opens checkout; sponsor is a
      // shareable "pay for me" link the vendor sends to their customer.
      let paymentUrl: string | null = null;
      if (timing === 'on_creation') {
        try {
          paymentUrl = await createPaymentLink(leg.id, effectivePurpose);
          if (paymentUrl && effectivePurpose === 'self' && typeof window !== 'undefined') {
            window.open(paymentUrl, '_blank', 'noopener,noreferrer');
          }
        } catch (err) {
          // The booking succeeded; surface the payment issue without losing it.
          setSubmitError(
            `Booked, but we couldn’t start payment: ${apiErrorMessage(err)} You can pay from My bookings.`,
          );
        }
      }

      setResult({ leg, paymentUrl, purpose: effectivePurpose });
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(apiErrorMessage(err));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (result) {
    return <Success result={result} choice={choice as BookingChoice} onBookings={onBookings} onAnother={() => {
      setResult(null);
      setChoice('');
      setName(''); setPhone(''); setAddress(null); setDate(''); setTime(''); setNote('');
      setTiming('on_creation'); setPurpose('self'); setErrors({}); setSubmitError('');
    }} />;
  }

  const submitLabel = choice === 'delivery' ? 'Request delivery' : choice === 'round_trip' ? 'Request round trip' : 'Request pickup';

  return (
    <div className="mx-auto max-w-xl">
      <BackLink />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Book a pickup or delivery</h1>
      <p className="mt-1 text-sm text-body">
        Request a Washermann rep to move laundry between you and your customer. We handle the
        movement and price it automatically.
      </p>

      {!verified && <VerificationPendingBanner />}

      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        {/* A. Service */}
        <section>
          <SectionTitle n="1" title="What do you need?" />
          <div className="mt-3 grid gap-3">
            {SERVICES.map((s) => {
              const on = choice === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { setChoice(s.value); setErrors((p) => ({ ...p, service: undefined })); }}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
                    on ? 'border-primary bg-mint-soft' : 'border-line bg-white hover:bg-section',
                  )}
                >
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', on ? 'bg-primary text-white' : 'bg-section text-forest')}>
                    {s.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{s.title}</span>
                    <span className="block text-sm text-body">{s.desc}</span>
                  </span>
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', on ? 'border-primary bg-primary text-white' : 'border-line')}>
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.service && <p className="mt-2 text-sm text-danger">{errors.service}</p>}
        </section>

        {choice && (
          <>
            {/* B. Customer */}
            <section className="space-y-4">
              <SectionTitle n="2" title="Your customer" sub="Where our rep meets your customer, and who to reach." />
              <AddressSearch
                label="Customer's address"
                required
                value={address}
                onChange={(v) => { setAddress(v); if (v) setErrors((p) => ({ ...p, recipientAddress: undefined })); }}
                proximity={proximity}
                error={errors.recipientAddress}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Customer's name" required placeholder="e.g. Amaka O." value={name}
                  onChange={(e) => setName(e.target.value)} error={errors.recipientName} />
                <Input label="Customer's phone" required type="tel" inputMode="tel" placeholder="0803 123 4567"
                  value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.recipientPhone} />
              </div>
            </section>

            {/* C. When + note */}
            <section className="space-y-4">
              <SectionTitle n="3" title="When & notes" sub="Leave the time blank for as soon as possible. We’ll confirm with you." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Preferred date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
                <Input label="Preferred time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <Textarea label="Note for the rep" placeholder="e.g. Call on arrival, gate code, fragile items" maxLength={1000}
                value={note} onChange={(e) => setNote(e.target.value)} />
            </section>

            {/* D. Payment */}
            <section className="space-y-3">
              <SectionTitle n="4" title="Payment" />
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  active={timing === 'on_creation'} onClick={() => setTiming('on_creation')}
                  icon={<CreditCard size={18} />} title="Pay now"
                  desc="Settle the fee now so a rep can be dispatched."
                />
                <ChoiceCard
                  active={timing === 'on_arrival'} onClick={() => { setTiming('on_arrival'); setPurpose('self'); }}
                  icon={<Clock size={18} />} title="Pay on arrival"
                  desc="Pay yourself when the rep arrives (no shared link)."
                />
              </div>

              {timing === 'on_creation' && (
                <div className="rounded-2xl border border-line bg-section/60 p-4">
                  <p className="text-sm font-semibold text-ink">Who pays?</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ChoiceCard
                      compact active={purpose === 'self'} onClick={() => setPurpose('self')}
                      icon={<Wallet size={16} />} title="I’ll pay"
                      desc="Opens a secure checkout now."
                    />
                    <ChoiceCard
                      compact active={purpose === 'sponsor'} onClick={() => setPurpose('sponsor')}
                      icon={<Copy size={16} />} title="My customer pays"
                      desc="Get a link to send them."
                    />
                  </div>
                </div>
              )}
            </section>

            <div className="flex items-start gap-2.5 rounded-2xl bg-info-bg px-4 py-3 text-sm text-info">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>
                Washermann prices each trip automatically from the distance — you’ll see the fee once
                it’s booked. A booking isn’t confirmed until the fee is settled.
                {choice === 'round_trip' && ' For a round trip we book the pickup now; the return trip is created after you’ve washed.'}
              </span>
            </div>

            {submitError && (
              <div className="rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger">{submitError}</div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              {submitting ? 'Sending request…' : submitLabel}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}

// ─── Success ──────────────────────────────────────────────────────────────────

function Success({ result, choice, onBookings, onAnother }: {
  result: { leg: CreatedLeg; paymentUrl: string | null; purpose: PaymentPurpose };
  choice: BookingChoice;
  onBookings: () => void;
  onAnother: () => void;
}) {
  const { leg, paymentUrl, purpose } = result;
  const [copied, setCopied] = useState(false);
  const roundTrip = choice === 'round_trip';
  const payNow = leg.paymentTiming === 'on_creation';

  async function copy() {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the link is still visible to copy manually */ }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success">
          <Check size={28} strokeWidth={2.5} />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">{roundTrip ? 'Round trip requested' : 'Request received'}</h1>
        <p className="mt-1 text-sm text-body">Your booking reference</p>
        <p className="mt-1 font-mono text-lg font-bold tracking-wide text-forest">{leg.reference}</p>

        <dl className="mx-auto mt-5 max-w-sm space-y-2 rounded-2xl bg-section p-4 text-left text-sm">
          <Row label="Service" value={CHOICE_LABEL[choice]} />
          {leg.recipient && <Row label="Customer" value={leg.recipient.name} />}
          <Row label="Fee" value={<strong>{formatNaira(leg.nairaEquivalent)}</strong>} />
          <Row label="Payment" value={payNow ? 'Pay now' : 'Pay on arrival'} />
        </dl>

        <p className="mt-4 text-sm text-body">
          {payNow
            ? 'Your booking isn’t confirmed until the fee is paid. '
            : 'A rep can be dispatched before payment; you’ll pay when they arrive, from My bookings. '}
          {roundTrip && 'The return trip (clean laundry back to your customer) is created after you mark it ready — you’ll start it from My bookings.'}
        </p>

        {/* Pay-now, self: checkout opened in a new tab; offer a manual link too. */}
        {payNow && purpose === 'self' && paymentUrl && (
          <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-white hover:bg-primary-dark">
            <CreditCard size={17} /> Open payment ({formatNaira(leg.nairaEquivalent)})
          </a>
        )}

        {/* Pay-now, sponsor: shareable link for the customer. */}
        {payNow && purpose === 'sponsor' && paymentUrl && (
          <div className="mt-5 rounded-2xl border border-line p-4 text-left">
            <p className="text-sm font-semibold text-ink">Send this link to your customer</p>
            <p className="mt-0.5 text-xs text-faint">They pay the fee directly. The booking confirms once it’s paid.</p>
            <div className="mt-3 flex items-center gap-2">
              <input readOnly value={paymentUrl} className="h-10 min-w-0 flex-1 rounded-full bg-section px-4 text-sm text-ink" />
              <Button type="button" variant="soft" onClick={copy} className="shrink-0">
                {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
              </Button>
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-section text-body hover:bg-line" aria-label="Open link">
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={onAnother}>Book another</Button>
          <Button type="button" variant="outline" onClick={onBookings}>View my bookings</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Small UI bits ────────────────────────────────────────────────────────────

function SectionTitle({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">{n}</span>
        <h2 className="font-semibold text-ink">{title}</h2>
      </div>
      {sub && <p className="mt-1 pl-[34px] text-sm text-body">{sub}</p>}
    </div>
  );
}

function ChoiceCard({ active, onClick, icon, title, desc, compact }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors',
        active ? 'border-primary bg-mint-soft' : 'border-line bg-white hover:bg-section',
      )}
    >
      <span className={cn('flex shrink-0 items-center justify-center rounded-lg', compact ? 'h-8 w-8' : 'h-9 w-9', active ? 'bg-primary text-white' : 'bg-section text-forest')}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-body">{desc}</span>
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-faint">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
