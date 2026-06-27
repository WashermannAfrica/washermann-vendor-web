'use client';

import { useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, ArrowRight, Check, Bell, Wallet, ShoppingBag, Star,
  ShieldCheck, Sparkles, type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

type Slide = {
  icon: LucideIcon;
  tone: string;
  badge: string;
  title: string;
  body: string;
  points: string[];
};

const SLIDES: Slide[] = [
  {
    icon: Bell,
    tone: 'bg-info-bg text-info',
    badge: 'Step 1 — Orders find you',
    title: 'A customer nearby places an order',
    body: 'When someone in an area you serve needs laundry done, Washermann broadcasts the order to vendors like you. You’ll get a ping — accept the ones you want.',
    points: [
      'You only see orders inside the areas you selected.',
      'First to accept gets the job — be quick during busy hours.',
      'No penalty for skipping an order you can’t take.',
    ],
  },
  {
    icon: ShoppingBag,
    tone: 'bg-mint-soft text-forest',
    badge: 'Step 2 — Pickup & wash',
    title: 'Collect, wash, and mark each stage',
    body: 'Update the order as you go — picked up, washing, ready, out for delivery. The customer sees every step, so they’re never left guessing.',
    points: [
      'Your item prices (the ones you set during onboarding) decide the payout.',
      'Keep statuses honest — it builds trust and repeat customers.',
      'Damaged or missing items? Flag it in-app immediately.',
    ],
  },
  {
    icon: Wallet,
    tone: 'bg-success-bg text-success',
    badge: 'Step 3 — You get paid',
    title: 'Money is held safely, then released',
    body: 'The customer pays upfront into escrow. Once the order is delivered and confirmed, your share lands in your Washermann earnings wallet — ready to withdraw.',
    points: [
      'Escrow protects both sides — no chasing customers for cash.',
      'Withdraw to your bank anytime your balance is above the minimum.',
      'Every payout is itemised so you always know what you earned.',
    ],
  },
  {
    icon: Star,
    tone: 'bg-warn-bg text-warn',
    badge: 'Step 4 — Ratings & growth',
    title: 'Great work brings more work',
    body: 'After delivery the customer rates you. A strong rating pushes you up the list, so you get first dibs on new orders in your area.',
    points: [
      'Speed, quality and clear communication move your rating most.',
      'Reply to feedback — customers notice vendors who care.',
      'Consistent 5-star service unlocks more visibility over time.',
    ],
  },
  {
    icon: ShieldCheck,
    tone: 'bg-violet-bg text-violet',
    badge: 'Good to know',
    title: 'A few house rules',
    body: 'Washermann works best when everyone plays fair. Keep these in mind and you’ll have a smooth run.',
    points: [
      'Prices you set are locked for a period — choose them carefully.',
      'Always use the app for handoffs so escrow and ratings stay accurate.',
      'Support is one tap away if anything ever goes wrong.',
    ],
  },
];

export default function LearnPage() {
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const slide = SLIDES[i];
  const Icon = slide.icon;
  const last = i === SLIDES.length - 1;

  function next() {
    if (last) {
      setDone(true);
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#13C490', '#3BF4BE', '#08503C', '#9C74EC'] });
    } else {
      setI((n) => n + 1);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-bg text-success"><Sparkles size={26} /></span>
          <h1 className="mt-4 text-xl font-bold text-ink">You know the ropes! 🎉</h1>
          <p className="mt-2 text-sm text-body">That’s the whole Washermann loop — orders come to you, you wash and update, escrow pays you out, and great ratings bring more work.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button onClick={() => { setDone(false); setI(0); }} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-body hover:bg-section">Watch again</button>
            <Link href="/game" className="rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">Play Sud Tap →</Link>
            <Link href="/dashboard" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">Back to dashboard</Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-body hover:text-ink"><ArrowLeft size={16} /> Dashboard</Link>
        <span className="text-xs font-medium text-faint">{i + 1} / {SLIDES.length}</span>
      </div>

      {/* progress dots */}
      <div className="mb-5 flex gap-1.5">
        {SLIDES.map((_, n) => (
          <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= i ? 'bg-primary' : 'bg-section'}`} />
        ))}
      </div>

      <Card>
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${slide.tone}`}><Icon size={24} /></span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-faint">{slide.badge}</p>
        <h1 className="mt-1 text-xl font-bold text-ink">{slide.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-body">{slide.body}</p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {slide.points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-body">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-soft text-forest"><Check size={13} /></span>
              {p}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-body disabled:opacity-0 hover:bg-section"><ArrowLeft size={16} /> Back</button>
        <button onClick={next} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">{last ? 'Finish' : 'Next'} <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}
