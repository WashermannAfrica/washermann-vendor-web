'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Wordmark } from '@/components/Wordmark';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (ready && !isAuthenticated) router.replace('/login');
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Wordmark className="text-lg font-bold tracking-tight text-forest" />
          <div className="flex items-center gap-4">
            {user?.fullName && <span className="hidden text-sm text-body sm:inline">{user.fullName}</span>}
            <button
              onClick={() => { logout(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-body hover:bg-section"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8">{children}</main>
    </div>
  );
}
