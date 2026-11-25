// Address → coordinates via the Mapbox Geocoding API (same token/pattern the
// admin app uses). The backend requires recipient latitude/longitude on every
// logistics leg, so the vendor picks a real place here and we capture its point.
//
// The token is read as an env key-name; it is intentionally NOT bundled with a
// value. Set NEXT_PUBLIC_MAPBOX_TOKEN in the portal's env to enable search.

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
export const MAPBOX_ENABLED = MAPBOX_TOKEN.length > 0;

export interface GeocodeHit {
  id: string;
  /** Short place name, e.g. "Ikate". */
  name: string;
  /** Full address line, e.g. "Ikate, Lekki, Lagos, Nigeria". */
  placeName: string;
  latitude: number;
  longitude: number;
}

export interface GeocodeOptions {
  /** Bias results toward a point (the vendor's area) for more relevant hits. */
  proximity?: { latitude: number; longitude: number };
  signal?: AbortSignal;
}

interface MapboxFeature {
  id: string;
  text: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

/**
 * Nigeria-bounded place search. No `types` filter: Mapbox's Nigerian locality
 * data is thin, so streets/POIs are useful anchors the vendor can pick from.
 * Throws when the token is missing or the request fails.
 */
export async function geocodeAddress(query: string, opts: GeocodeOptions = {}): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (!q) return [];
  if (!MAPBOX_ENABLED) throw new Error('Address lookup is not configured.');

  const proximity = opts.proximity
    ? `&proximity=${opts.proximity.longitude.toFixed(4)},${opts.proximity.latitude.toFixed(4)}`
    : '';
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${MAPBOX_TOKEN}&country=ng&limit=6&autocomplete=true&language=en${proximity}`;

  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok) throw new Error('Could not look up that address. Please try again.');
  const data = (await res.json()) as { features?: MapboxFeature[] };

  return (data.features ?? []).map((f) => ({
    id: f.id,
    name: f.text,
    placeName: f.place_name,
    longitude: f.center[0],
    latitude: f.center[1],
  }));
}
