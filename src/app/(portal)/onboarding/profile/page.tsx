'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import type { ApiResponse, VendorProfile, ServiceArea } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<VendorProfile>>('/vendors/me/profile'),
      api.get<ApiResponse<ServiceArea[]>>('/areas/public'),
    ])
      .then(([p, a]) => {
        const prof = p.data.data;
        setBusinessName(prof.businessName ?? '');
        setPhone(prof.phone ?? '');
        setAreaIds(prof.areaIds ?? []);
        setAreas(Array.isArray(a.data.data) ? a.data.data : []);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function toggleArea(id: string) {
    setAreaIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.patch('/vendors/me/profile', {
        businessName: businessName.trim() || undefined,
        phone: phone.trim() || undefined,
        areaIds,
      });
      setSaved(true);
      setToast(true);
      setTimeout(() => router.push('/dashboard'), 1400);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-24 text-primary"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-xl">
      <button onClick={() => router.push('/dashboard')} className="mb-4 flex items-center gap-1.5 text-sm text-body hover:text-ink">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Business profile</h1>
      <p className="mt-1 text-sm text-body">Tell customers about your business and where you operate.</p>

      <form onSubmit={save} className="mt-6 space-y-5">
        <Input label="Business name" required placeholder="e.g. SparkleWash Laundry" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        <Input label="Business phone" required placeholder="+2348012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <div>
          <label className="text-sm font-semibold text-ink">Areas you serve</label>
          <p className="mb-3 text-xs text-faint">Pick the areas your coverage falls under. The towns shown under each area are what it covers.</p>
          {areas.length === 0 ? (
            <Card className="text-sm text-faint">No service areas are available yet.</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {areas.map((a) => {
                const on = areaIds.includes(a.id);
                return (
                  <button
                    key={a.id} type="button" onClick={() => toggleArea(a.id)}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors',
                      on ? 'border-primary bg-mint-soft' : 'border-line bg-white hover:bg-section',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">{a.name}</p>
                        <p className="text-xs text-faint">{a.state}</p>
                      </div>
                      <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', on ? 'border-primary bg-primary text-white' : 'border-line')}>
                        {on && <Check size={12} strokeWidth={3} />}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {a.locations.slice(0, 6).map((l) => (
                        <span key={l.id} className="rounded-md border border-line bg-white px-1.5 py-0.5 text-[11px] text-body">{l.name}</span>
                      ))}
                      {a.locations.length > 6 && <span className="self-center text-[11px] text-faint">+{a.locations.length - 6}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" loading={saving} className="w-full">
          {saved ? <><Check size={16} /> Submitted</> : 'Submit'}
        </Button>
      </form>

      {/* submit toast */}
      {toast && (
        <div className="fixed left-1/2 top-20 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-forest-deep px-5 py-3 text-sm font-medium text-white shadow-xl animate-[fadeIn_.2s_ease]">
          <Check size={16} className="text-mint" /> Business profile submitted
        </div>
      )}
    </div>
  );
}
