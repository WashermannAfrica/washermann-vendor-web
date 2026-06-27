'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { BASE_URL, apiErrorMessage } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthBody, AuthHeading } from '@/components/ui/AuthShell';

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/auth/verify-otp`, { identifier: email, otp: otp.trim(), channel: 'email' });
      router.replace('/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err, 'That code is invalid or has expired.'));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError('');
    setNote('');
    setResending(true);
    try {
      await axios.post(`${BASE_URL}/auth/resend-otp`, { identifier: email, channel: 'email' });
      setNote('A new code has been sent to your email.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not resend the code.'));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthBody>
      <AuthHeading
        line1="Verify your email"
        subtitle={<>We sent a 6-digit code to <strong>{email || 'your email'}</strong>. Enter it below.</>}
      />

      <form onSubmit={handleSubmit} className="mt-12 space-y-5">
        <Input
          label="Verification code" required inputMode="numeric" maxLength={6}
          placeholder="123456" value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className="text-center text-lg tracking-[0.3em]"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {note && <p className="text-sm text-success">{note}</p>}
        <Button type="submit" size="lg" loading={loading} disabled={otp.length !== 6} className="w-full">Verify</Button>
      </form>

      <button onClick={resend} disabled={resending} className="mt-6 block w-full text-center text-sm text-body hover:text-ink">
        {resending ? 'Sending…' : "Didn't get it? Resend code"}
      </button>
    </AuthBody>
  );
}
