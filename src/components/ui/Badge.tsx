import { cn } from '@/lib/utils';

type Tone = 'success' | 'warn' | 'danger' | 'info' | 'violet' | 'neutral';

const tones: Record<Tone, string> = {
  success: 'bg-success-bg text-success',
  warn:    'bg-warn-bg text-warn',
  danger:  'bg-danger-bg text-danger',
  info:    'bg-info-bg text-info',
  violet:  'bg-violet-bg text-violet',
  neutral: 'bg-section text-body',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
