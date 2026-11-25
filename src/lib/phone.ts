// Nigerian mobile numbers. Accepts 0803 123 4567, +234 803 123 4567,
// 2348031234567; normalises to the E.164 form the API stores (+234…).
// Mirrors the server rule ^(?:\+?234|0)[789][01]\d{8}$.

const NG_MOBILE = /^(?:\+?234|0)([789][01]\d{8})$/;

function strip(raw: string): string {
  return (raw ?? '').replace(/[\s\-().]/g, '');
}

export function isValidNigerianPhone(raw: string): boolean {
  return NG_MOBILE.test(strip(raw));
}

/** Returns "+2348031234567", or null when the number isn't a valid Nigerian mobile. */
export function normalizeNigerianPhone(raw: string): string | null {
  const m = strip(raw).match(NG_MOBILE);
  return m ? `+234${m[1]}` : null;
}

/** "+2348031234567" (or any accepted form) → "0803 123 4567" for display. */
export function formatNigerianPhone(raw: string): string {
  const n = normalizeNigerianPhone(raw);
  if (!n) return raw;
  const local = '0' + n.slice(4);
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
