'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Check, FileText } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type DocType = 'nin' | 'cac' | 'address_proof' | 'photo';

const DOCS: { type: DocType; label: string; desc: string }[] = [
  { type: 'nin', label: 'NIN / ID', desc: 'National ID or government-issued ID.' },
  { type: 'cac', label: 'CAC / Business registration', desc: 'Your business registration document.' },
  { type: 'address_proof', label: 'Proof of address', desc: 'Utility bill or tenancy agreement.' },
  { type: 'photo', label: 'Owner photo', desc: 'A clear photo of the business owner.' },
];

function DocSlot({ doc }: { doc: { type: DocType; label: string; desc: string } }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('documentType', doc.type);
      await api.post('/upload/vendor/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDone(true);
      setName(file.name);
    } catch (err) {
      setError(apiErrorMessage(err, 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="flex items-center gap-4">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${done ? 'bg-success-bg text-success' : 'bg-section text-faint'}`}>
        {done ? <Check size={20} /> : <FileText size={20} />}
      </span>
      <div className="flex-1">
        <p className="font-semibold text-ink">{doc.label}</p>
        <p className="text-sm text-body">{done ? name || 'Uploaded' : doc.desc}</p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" hidden onChange={onFile} />
      <Button size="sm" variant={done ? 'outline' : 'soft'} loading={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? '' : done ? 'Replace' : <><Upload size={14} /> Upload</>}
      </Button>
    </Card>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl">
      <button onClick={() => router.push('/dashboard')} className="mb-4 flex items-center gap-1.5 text-sm text-body hover:text-ink">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Verification documents</h1>
      <p className="mt-1 text-sm text-body">Upload these so our team can verify your business. PDFs or images.</p>

      <div className="mt-6 flex flex-col gap-3">
        {DOCS.map((d) => <DocSlot key={d.type} doc={d} />)}
      </div>

      <Button className="mt-6 w-full" onClick={() => router.push('/dashboard')}>Done</Button>
    </div>
  );
}
