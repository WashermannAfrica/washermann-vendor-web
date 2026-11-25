// ─── Logistics booking: API client, types and display helpers ─────────────────
// Talks to the REAL backend (washermann-api) logistics + orders endpoints.
// The vendor is the requester; their saved shop location is the shop side, and
// the "recipient" captured here is always the vendor's own customer.

import { api } from '@/lib/api';
import type { ApiResponse } from '@/types';

// ─── Domain types ─────────────────────────────────────────────────────────────

/** What the vendor picks on the form. */
export type BookingChoice = 'pickup' | 'delivery' | 'round_trip';

/** Backend order flow for a logistics leg. */
export type OrderFlow =
  | 'logistics_delivery' // shop → customer (deliver clean)
  | 'logistics_collect'; // customer → shop (collect dirty)

export type PaymentTiming = 'on_creation' | 'on_arrival';
export type PaymentPurpose = 'self' | 'sponsor';

export interface Recipient {
  name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface CreateLegBody {
  vendorId: string;
  recipient: Recipient;
  scheduledPickupAt?: string;
  note?: string;
  paymentTiming?: PaymentTiming;
}

/** Shape returned by the create endpoints (logistics.service `present()`). */
export interface CreatedLeg {
  id: string;
  reference: string;
  flow: OrderFlow;
  requesterType: 'vendor' | 'customer';
  paymentTiming: PaymentTiming;
  status: string;
  vendorId: string | null;
  recipient: Recipient | null;
  transportWp: number;
  mobilityFeeWp: number;
  totalWP: number;
  nairaEquivalent: number;
  trackingToken: string | null;
  parentOrderId: string | null;
  scheduledPickupAt: string | null;
}

/** A logistics leg as returned by GET /orders/me (decorated Order entity). */
export interface LogisticsLeg {
  id: string;
  reference: string;
  flow: OrderFlow;
  status: string;
  recipient: Recipient | null;
  paymentTiming: PaymentTiming | null;
  nairaEquivalentSnapshot: number | null;
  totalWP: number | null;
  parentOrderId: string | null;
  scheduledPickupAt: string | null;
  createdAt: string;
  specialInstructions: string | null;
  trackingToken: string | null;
  pricingSnapshot: { roundTrip?: boolean; flow?: string; [k: string]: unknown } | null;
}

/** True when this collect leg was booked as the first half of a round trip. */
export function isRoundTripPickup(leg: LogisticsLeg): boolean {
  return leg.flow === 'logistics_collect' && !!leg.pricingSnapshot?.roundTrip;
}

// ─── API calls ────────────────────────────────────────────────────────────────

const ENDPOINT: Record<BookingChoice, string> = {
  pickup: '/logistics/collect',
  delivery: '/logistics/delivery',
  round_trip: '/logistics/round-trip',
};

/** Unwrap `{ success, data }` envelopes, tolerating a bare object too. */
function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === 'object' && 'data' in (p as object)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

export async function createBooking(choice: BookingChoice, body: CreateLegBody): Promise<CreatedLeg> {
  const { data } = await api.post(ENDPOINT[choice], body);
  return unwrap<CreatedLeg>(data);
}

/**
 * Create a payment link for a leg and return a URL to open.
 * The backend may return a Paystack checkout URL or a funding/sponsor landing
 * URL depending on the purpose and its current wiring, so we accept any of the
 * usual URL fields rather than assuming one key.
 */
export async function createPaymentLink(legId: string, purpose: PaymentPurpose): Promise<string> {
  const { data } = await api.post(`/logistics/${legId}/payment-link`, { purpose });
  const d = unwrap<Record<string, unknown>>(data);
  const url = extractUrl(d) ?? extractUrl(data as Record<string, unknown>);
  if (!url) throw new Error('No payment link was returned. Please try again.');
  return url;
}

function extractUrl(obj: Record<string, unknown> | undefined): string | null {
  if (!obj) return null;
  const keys = ['authorizationUrl', 'authorization_url', 'checkoutUrl', 'paymentUrl', 'url', 'shareUrl', 'link'];
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && /^https?:\/\//.test(v)) return v;
  }
  return null;
}

/**
 * Round trip: once the clothes are washed, the vendor marks the collect leg ready,
 * which spawns the delivery (return) leg back to the same customer.
 */
export async function markReadyToDeliver(legId: string): Promise<CreatedLeg> {
  const { data } = await api.post(`/logistics/${legId}/ready-to-deliver`, {});
  return unwrap<CreatedLeg>(data);
}

/** The vendor's own logistics legs, newest first. */
export async function listMyBookings(): Promise<LogisticsLeg[]> {
  const { data } = await api.get<ApiResponse<LogisticsLeg[]>>('/orders/me', {
    params: { flow: 'logistics', limit: 100 },
  });
  const rows = unwrap<LogisticsLeg[]>(data) ?? [];
  // Defensive: keep only logistics legs even if the flow filter isn't live yet.
  return (Array.isArray(rows) ? rows : []).filter(
    (o) => o.flow === 'logistics_collect' || o.flow === 'logistics_delivery',
  );
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const CHOICE_LABEL: Record<BookingChoice, string> = {
  pickup: 'Pickup (dirty)',
  delivery: 'Delivery (clean)',
  round_trip: 'Round trip',
};

export const FLOW_LABEL: Record<OrderFlow, string> = {
  logistics_collect: 'Pickup (dirty)',
  logistics_delivery: 'Delivery (clean)',
};

/** Friendly label + Badge tone for each backend order status. */
const STATUS: Record<string, { label: string; tone: 'success' | 'warn' | 'danger' | 'info' | 'neutral' }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'warn' },
  paid: { label: 'Paid', tone: 'info' },
  broadcasting_rep: { label: 'Finding a rep', tone: 'info' },
  rep_assigned: { label: 'Rep assigned', tone: 'info' },
  broadcasting_vendor: { label: 'Assigning', tone: 'info' },
  vendor_assigned: { label: 'Assigned', tone: 'info' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  rep_en_route_pickup: { label: 'Rep on the way', tone: 'info' },
  picked_up: { label: 'Picked up', tone: 'info' },
  with_vendor: { label: 'At your shop', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'info' },
  ready_for_delivery: { label: 'Ready for delivery', tone: 'info' },
  rep_collected: { label: 'Rep collected', tone: 'info' },
  out_for_delivery: { label: 'Out for delivery', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  delivery_failed: { label: 'Delivery failed', tone: 'danger' },
  abandoned: { label: 'Abandoned', tone: 'danger' },
  disputed: { label: 'Disputed', tone: 'warn' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export function statusLabel(status: string): string {
  return STATUS[status]?.label ?? status.replace(/_/g, ' ');
}

export function statusTone(status: string): 'success' | 'warn' | 'danger' | 'info' | 'neutral' {
  return STATUS[status]?.tone ?? 'neutral';
}

/** A leg is unpaid (and so payable) only while it awaits payment. */
export function isUnpaid(status: string): boolean {
  return status === 'pending_payment';
}

export const PAYMENT_TIMING_LABEL: Record<PaymentTiming, string> = {
  on_creation: 'Pay now',
  on_arrival: 'Pay on arrival',
};
