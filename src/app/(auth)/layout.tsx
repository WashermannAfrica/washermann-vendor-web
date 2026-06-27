import { Wordmark } from '@/components/Wordmark';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-white">
      <div className="absolute left-8 top-7">
        <Wordmark />
      </div>
      {children}
    </div>
  );
}
