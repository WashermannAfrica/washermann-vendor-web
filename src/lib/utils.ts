// ─── Class name helper ────────────────────────────────────────────────────────

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Number formatting ────────────────────────────────────────────────────────

/** Naira amount (cash rewards/payouts). */
export function formatNaira(value: number): string {
  return `₦${Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

export function formatWP(value: number): string {
  return `${Number(value || 0).toLocaleString()} WP`;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Status helpers ───────────────────────────────────────────────────────────

/** Maps a referral/payout status to a Badge tone. */
export function statusTone(status: string): 'success' | 'warn' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'available':
    case 'completed':
    case 'active':
      return 'success';
    case 'pending':
    case 'processing':
    case 'onboarding':
      return 'warn';
    case 'rejected':
    case 'failed':
    case 'suspended':
      return 'danger';
    case 'paid':
      return 'info';
    default:
      return 'neutral';
  }
}

export function titleCase(s: string): string {
  return s.replace(/(^|[\s_-])\w/g, (m) => m.toUpperCase()).replace(/[_-]/g, ' ');
}
