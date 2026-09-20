// Environment-aware base for the public policy pages (served by the landing site).
// Set NEXT_PUBLIC_LANDING_URL per environment (e.g. http://localhost:3003 in dev,
// https://washermann.com in production).
export const LEGAL_BASE = (
  process.env.NEXT_PUBLIC_LANDING_URL ?? 'https://washermann.com'
).replace(/\/$/, '');

export const policyUrl = (key: string) => `${LEGAL_BASE}/legal/${key}`;
