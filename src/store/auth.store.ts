'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VendorUser } from '@/types';

interface AuthState {
  user: VendorUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** True once persisted state has loaded — guards the login-page flash. */
  hasHydrated: boolean;

  login: (user: VendorUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,

      login: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'wm-vendor-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
