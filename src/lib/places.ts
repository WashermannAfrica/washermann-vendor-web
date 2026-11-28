import { api } from './api';

// Address lookup via the backend's Google Places (New) proxy. The portal never
// sees the Google key — it calls the API, which holds it. Autocomplete returns
// predictions without coordinates; picking one resolves it to a latitude/
// longitude (the backend requires both on every logistics leg). A session token
// groups the typing + pick into a single billable Places session.

export interface PlaceSuggestion {
  placeId: string;
  /** Short place name, e.g. "Ikate". */
  name: string;
  /** Full address line, e.g. "Ikate, Lekki, Lagos, Nigeria". */
  placeName: string;
}

export interface PlaceLocation extends PlaceSuggestion {
  latitude: number;
  longitude: number;
}

export interface AutocompleteOptions {
  sessionToken?: string;
  /** Bias results toward the vendor's shop for more relevant hits. */
  proximity?: { latitude: number; longitude: number };
  signal?: AbortSignal;
}

/** A fresh Places session token (one per "start typing → pick" cycle). */
export function newSessionToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function isCanceled(signal: AbortSignal | undefined, err: unknown): boolean {
  return (
    !!signal?.aborted ||
    (err as { code?: string }).code === 'ERR_CANCELED' ||
    (err as Error).name === 'CanceledError'
  );
}

export async function placeAutocomplete(
  query: string,
  opts: AutocompleteOptions = {},
): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const params: Record<string, string> = { q };
  if (opts.sessionToken) params.sessionToken = opts.sessionToken;
  if (opts.proximity) {
    params.lat = opts.proximity.latitude.toFixed(5);
    params.lng = opts.proximity.longitude.toFixed(5);
  }

  try {
    const res = await api.get<{ data: PlaceSuggestion[] }>('/places/autocomplete', {
      params,
      signal: opts.signal,
    });
    return res.data?.data ?? [];
  } catch (err) {
    if (isCanceled(opts.signal, err)) {
      const e = new Error('aborted');
      e.name = 'AbortError'; // let the caller's abort guard ignore it
      throw e;
    }
    throw new Error('Could not look up that address. Please try again.');
  }
}

export async function placeDetails(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceLocation> {
  const params: Record<string, string> = { placeId };
  if (sessionToken) params.sessionToken = sessionToken;

  try {
    const res = await api.get<{ data: PlaceLocation }>('/places/details', { params });
    const d = res.data?.data;
    if (!d) throw new Error('empty');
    return d;
  } catch {
    throw new Error('Could not load that address. Please try again.');
  }
}
