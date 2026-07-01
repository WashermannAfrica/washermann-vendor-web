export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-white">
      <div className="absolute left-8 top-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-wordmark.png" alt="Washermann" className="h-7 w-auto" />
      </div>
      {children}
    </div>
  );
}
