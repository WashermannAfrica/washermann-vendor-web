'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Check, IdCard, FileText, UserRound, Store, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@/types';

type DocType = 'nin' | 'cac' | 'address_proof' | 'personal_photo' | 'shop_photo';
type VendorDoc = { id: string; documentType: string; fileUrl: string; originalName?: string | null };

async function uploadDoc(type: DocType, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('documentType', type);
  await api.post('/upload/vendor/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
}

/** A single uploadable section. `count` = how many of this type already exist. */
function Section({
  icon, title, desc, done, count, multiple, busy, onPick, children,
}: {
  icon: React.ReactNode; title: string; desc: string; done: boolean; count: number;
  multiple?: boolean; busy: boolean; onPick: (f: File) => void; children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Card className={cn('transition-colors', done && 'border-success/40 bg-success-bg/30')}>
      <div className="flex items-start gap-4">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', done ? 'bg-success-bg text-success' : 'bg-mint-soft text-forest')}>
          {done ? <Check size={20} /> : icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold text-ink">
            {title}
            {done
              ? <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-medium text-success">{multiple && count > 1 ? `${count} uploaded` : 'Submitted'}</span>
              : <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-medium text-warn">Required</span>}
          </p>
          <p className="mt-0.5 text-sm text-body">{desc}</p>
          {children}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
      <Button size="sm" variant={done ? 'outline' : 'soft'} loading={busy} className="mt-3 w-full" onClick={() => inputRef.current?.click()}>
        {!busy && <>{done ? (multiple ? <><Plus size={14} /> Add another</> : 'Replace') : <><Upload size={14} /> Upload</>}</>}
      </Button>
    </Card>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const [present, setPresent] = useState<Record<string, number>>({});
  const [idChoice, setIdChoice] = useState<'nin' | 'cac'>('nin');
  const [busy, setBusy] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<ApiResponse<VendorDoc[]>>('/vendors/me/documents')
      .then((r) => {
        const counts: Record<string, number> = {};
        (Array.isArray(r.data.data) ? r.data.data : []).forEach((d) => { counts[d.documentType] = (counts[d.documentType] ?? 0) + 1; });
        setPresent(counts);
        if (counts.cac && !counts.nin) setIdChoice('cac');
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function handle(type: DocType, file: File) {
    setError('');
    setBusy(type);
    try {
      await uploadDoc(type, file);
      setPresent((p) => ({ ...p, [type]: (p[type] ?? 0) + 1 }));
    } catch (err) {
      setError(apiErrorMessage(err, 'Upload failed.'));
    } finally {
      setBusy(null);
    }
  }

  const idDone = !!(present.nin || present.cac);
  const addressDone = !!present.address_proof;
  const personalDone = !!present.personal_photo;
  const shopDone = !!present.shop_photo;
  const doneCount = [idDone, addressDone, personalDone, shopDone].filter(Boolean).length;
  const allDone = doneCount === 4;

  if (loading) return <div className="flex justify-center py-24 text-primary"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-xl pb-28">
      <button onClick={() => router.push('/dashboard')} className="mb-4 flex items-center gap-1.5 text-sm text-body hover:text-ink">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Identity & verification</h1>
      <p className="mt-1 text-sm text-body">Submit all four to get verified. Clear photos or PDFs, max 10MB each.</p>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-section px-4 py-3">
        <span className="text-sm font-medium text-ink">{doneCount} of 4 submitted</span>
        <div className="h-2 w-40 rounded-full bg-white">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(doneCount / 4) * 100}%` }} />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex flex-col gap-3">
        {/* 1. National identity — NIN or CAC */}
        <Section
          icon={<IdCard size={20} />} title="National identity"
          desc="Upload your NIN slip/card, or your CAC business registration."
          done={idDone} count={(present.nin ?? 0) + (present.cac ?? 0)}
          busy={busy === idChoice}
          onPick={(f) => handle(idChoice, f)}
        >
          <div className="mt-2 inline-flex rounded-full bg-section p-0.5">
            {(['nin', 'cac'] as const).map((opt) => (
              <button
                key={opt} type="button" onClick={() => setIdChoice(opt)}
                className={cn('rounded-full px-4 py-1.5 text-xs font-semibold transition-colors', idChoice === opt ? 'bg-white text-ink shadow-sm' : 'text-faint')}
              >
                {opt === 'nin' ? 'NIN' : 'CAC'}{present[opt] ? ' ✓' : ''}
              </button>
            ))}
          </div>
        </Section>

        {/* 2. Proof of address */}
        <Section
          icon={<FileText size={20} />} title="Proof of address"
          desc="A recent utility bill or tenancy agreement."
          done={addressDone} count={present.address_proof ?? 0} busy={busy === 'address_proof'}
          onPick={(f) => handle('address_proof', f)}
        />

        {/* 3. Personal photo */}
        <Section
          icon={<UserRound size={20} />} title="Personal photo"
          desc="A clear, recent photo of yourself (the owner)."
          done={personalDone} count={present.personal_photo ?? 0} busy={busy === 'personal_photo'}
          onPick={(f) => handle('personal_photo', f)}
        />

        {/* 4. Shop photos */}
        <Section
          icon={<Store size={20} />} title="Photos of your shop"
          desc="One or more clear photos of your laundry premises."
          done={shopDone} count={present.shop_photo ?? 0} multiple busy={busy === 'shop_photo'}
          onPick={(f) => handle('shop_photo', f)}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4 px-5 py-3">
          <span className="text-sm text-body">{allDone ? 'All documents submitted' : `${4 - doneCount} left`}</span>
          <Button size="lg" disabled={!allDone} onClick={() => router.push('/dashboard')}>
            {allDone ? <><Check size={16} /> Submit</> : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
