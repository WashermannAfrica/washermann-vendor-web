'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import axios from 'axios';
import { BASE_URL, apiErrorMessage } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthBody, AuthHeading } from '@/components/ui/AuthShell';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Always 200 (no account enumeration) — proceed to the code-entry step.
      await axios.post(`${BASE_URL}/auth/forgot-password`, { identifier: identifier.trim() });
      router.push(`/reset-password?email=${encodeURIComponent(identifier.trim())}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send a reset code. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody>
      <AuthHeading
        line1="Forgot your"
        line2="password?"
        subtitle="Enter the email or phone on your account and we'll send a 6-digit reset code."
      />

      <form onSubmit={handleSubmit} className="mt-12 space-y-5">
        <Input
          label="Email or phone" required placeholder="you@business.com" leftIcon={<Mail size={16} />}
          value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" loading={loading} disabled={!identifier.trim()} className="w-full">Send reset code</Button>
      </form>

      <p className="mt-8 text-center text-sm text-body">
        Remembered it? <a href="/login" className="font-semibold text-primary hover:underline">Back to sign in</a>
      </p>
    </AuthBody>
  );
}
