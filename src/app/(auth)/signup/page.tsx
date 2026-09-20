'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, User, Gift, Phone } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { BASE_URL, apiErrorMessage } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthBody, AuthHeading } from '@/components/ui/AuthShell';
import { policyUrl } from '@/lib/policies';
import type { ApiResponse } from '@/types';

interface RegisterResponse {
  data: { user: { id: string; email: string | null; fullName: string; roles: string[]; status: string }; accessToken: string; refreshToken: string };
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', referralCode: searchParams.get('ref') ?? '' });
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/^\+?[0-9]{10,15}$/.test(form.phone.trim())) {
      setError('Please enter a valid phone number.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Vendor Agreement, Terms and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post<RegisterResponse>(`${BASE_URL}/auth/vendor/register`, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        referralCode: form.referralCode.trim() || undefined,
      });
      const { user, accessToken, refreshToken } = data.data;
      login({ ...user, emailVerified: false }, accessToken, refreshToken);
      router.replace(`/verify?email=${encodeURIComponent(user.email ?? form.email)}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create your account.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBody>
      <AuthHeading
        line1="Grow with"
        line2="Washermann"
        subtitle="Register your laundry business to start receiving orders."
      />

      <form onSubmit={handleSubmit} className="mt-12 space-y-5">
        <Input label="Full name" required placeholder="e.g. Emeka Okafor" leftIcon={<User size={16} />} value={form.fullName} onChange={set('fullName')} />
        <Input label="Business email" required type="email" placeholder="you@business.com" leftIcon={<Mail size={16} />} value={form.email} onChange={set('email')} autoComplete="email" />
        <Input label="Phone number" required type="tel" inputMode="tel" placeholder="+2348012345678" leftIcon={<Phone size={16} />} value={form.phone} onChange={set('phone')} autoComplete="tel" />
        <Input
          label="Password" required type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters"
          value={form.password} onChange={set('password')} autoComplete="new-password"
          rightIcon={<button type="button" onClick={() => setShowPassword((s) => !s)} className="text-faint hover:text-body">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
        />
        <Input label="Referral code (optional)" placeholder="WM-XXXXXX" leftIcon={<Gift size={16} />} value={form.referralCode} onChange={set('referralCode')} />

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-body">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line"
          />
          <span>
            I agree to Washermann&apos;s{' '}
            <a href={policyUrl('vendor-agreement')} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Vendor Agreement</a>,{' '}
            <a href={policyUrl('terms-of-service')} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Terms of Service</a>, and{' '}
            <a href={policyUrl('privacy-policy')} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Privacy Policy</a>.
          </span>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" loading={loading} disabled={!agreed} className="w-full">Create account</Button>
      </form>

      <p className="mt-8 text-center text-sm text-body">
        Already have an account? <a href="/login" className="font-semibold text-primary hover:underline">Sign in</a>
      </p>
    </AuthBody>
  );
}
