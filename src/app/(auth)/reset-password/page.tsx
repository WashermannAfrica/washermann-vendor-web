'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail } from 'lucide-react';
import axios from 'axios';
import { BASE_URL, apiErrorMessage } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthBody, AuthHeading } from '@/components/ui/AuthShell';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilled = searchParams.get('email') ?? '';

  const [identifier, setIdentifier] = useState(prefilled);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const valid = otp.length === 6 && password.length >= 8 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/auth/reset-password`, { identifier: identifier.trim(), otp: otp.trim(), password });
      router.replace('/login?reset=1');
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid or expired reset code.'));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError('');
    setNote('');
    setResending(true);
    try {
      await axios.post(`${BASE_URL}/auth/forgot-password`, { identifier: identifier.trim() });
      setNote('A new reset code has been sent.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not resend the code. Please wait a moment and try again.'));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthBody>
      <AuthHeading
        line1="Reset your"
        line2="password"
        subtitle={<>Enter the 6-digit code sent to <strong>{prefilled || 'your email'}</strong> and choose a new password.</>}
      />

      <form onSubmit={handleSubmit} className="mt-12 space-y-5">
        {!prefilled && (
          <Input
            label="Email or phone" required placeholder="you@business.com" leftIcon={<Mail size={16} />}
            value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username"
          />
        )}
        <Input
          label="Reset code" required inputMode="numeric" maxLength={6} placeholder="123456"
          value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className="text-center text-lg tracking-[0.3em]"
        />
        <Input
          label="New password" required type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters"
          value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
          rightIcon={<button type="button" onClick={() => setShowPassword((s) => !s)} className="text-faint hover:text-body">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
        />
        <Input
          label="Confirm new password" required type={showPassword ? 'text' : 'password'} placeholder="Re-enter password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {note && <p className="text-sm text-success">{note}</p>}
        <Button type="submit" size="lg" loading={loading} disabled={!valid} className="w-full">Reset password</Button>
      </form>

      <button onClick={resend} disabled={resending} className="mt-6 block w-full text-center text-sm text-body hover:text-ink">
        {resending ? 'Sending…' : "Didn't get a code? Resend"}
      </button>
      <p className="mt-4 text-center text-sm text-body">
        <a href="/login" className="font-semibold text-primary hover:underline">Back to sign in</a>
      </p>
    </AuthBody>
  );
}
