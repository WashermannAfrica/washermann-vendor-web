import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import EnvBadge from '@/components/EnvBadge';
import PwaProvider from '@/components/pwa/PwaProvider';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Washermann Vendor',
  description: 'Register your laundry business with Washermann.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Washermann' },
  // Next emits the modern `mobile-web-app-capable`; add the legacy Apple tag too
  // so older iOS Safari also opens the installed app in standalone mode.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  themeColor: '#00281c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body suppressHydrationWarning>
        {children}
        <EnvBadge />
        <PwaProvider />
      </body>
    </html>
  );
}
