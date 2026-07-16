import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import EnvBadge from '@/components/EnvBadge';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Washermann Vendor',
  description: 'Register your laundry business with Washermann.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body suppressHydrationWarning>
        {children}
        <EnvBadge />
      </body>
    </html>
  );
}
