'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Check, X } from 'lucide-react';
import { geocodeAddress, MAPBOX_ENABLED, type GeocodeHit } from '@/lib/mapbox';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

export interface SelectedAddress {
  address: string;
  latitude: number;
  longitude: number;
}

interface AddressSearchProps {
  label: string;
  required?: boolean;
  value: SelectedAddress | null;
  onChange: (value: SelectedAddress | null) => void;
  /** Bias results toward the vendor's shop for more relevant hits. */
  proximity?: { latitude: number; longitude: number };
  error?: string;
  id?: string;
}

/**
 * Address → coordinates picker. The vendor searches, picks a real place, and we
 * capture its latitude/longitude (required by the backend). Editing the text
 * after a pick clears the captured point so a stale coordinate can't be sent.
 */
export function AddressSearch({ label, required, value, onChange, proximity, error, id }: AddressSearchProps) {
  const inputId = id ?? 'address-search';
  const [query, setQuery] = useState(value?.address ?? '');
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [noHits, setNoHits] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = value != null && value.address === query;

  // Debounced search; aborts the in-flight request when the query changes.
  useEffect(() => {
    if (!MAPBOX_ENABLED) return;
    const q = query.trim();
    if (selected || q.length < 3) {
      setHits([]);
      setNoHits(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      setLookupError('');
      try {
        const found = await geocodeAddress(q, { proximity, signal: ctrl.signal });
        setHits(found);
        setNoHits(found.length === 0);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setLookupError((err as Error).message || 'Address lookup failed.');
          setHits([]);
        }
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query, selected, proximity]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(h: GeocodeHit) {
    setQuery(h.placeName);
    onChange({ address: h.placeName, latitude: h.latitude, longitude: h.longitude });
    setHits([]);
    setOpen(false);
    setNoHits(false);
  }

  function onType(v: string) {
    setQuery(v);
    if (value) onChange(null); // editing invalidates the captured coordinates
  }

  function clear() {
    setQuery('');
    onChange(null);
    setHits([]);
    setNoHits(false);
  }

  if (!MAPBOX_ENABLED) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-ink">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        <div className="rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn">
          Address search is unavailable: <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> isn’t set for this
          portal. Add it to the environment to capture pickup/delivery coordinates.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" ref={boxRef}>
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-faint">
          {selected ? <MapPin size={16} className="text-primary" /> : <Search size={16} />}
        </span>
        <input
          id={inputId}
          value={query}
          onChange={(e) => onType(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          autoComplete="off"
          placeholder="Search a street, area or landmark"
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-12 w-full rounded-full bg-section pl-11 pr-11 text-sm text-ink',
            'placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/40',
            error && 'ring-2 ring-danger/40',
            selected && 'ring-2 ring-primary/40',
          )}
        />
        {searching ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary"><Spinner size="sm" /></span>
        ) : query ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear address"
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-faint hover:bg-line"
          >
            <X size={15} />
          </button>
        ) : null}

        {open && (hits.length > 0 || noHits) && (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-lg">
            {hits.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => pick(h)}
                className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-section"
              >
                <MapPin size={16} className="mt-0.5 shrink-0 text-faint" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{h.name}</span>
                  <span className="block truncate text-xs text-faint">{h.placeName}</span>
                </span>
              </button>
            ))}
            {noHits && (
              <p className="px-3 py-2.5 text-sm text-faint">No places found. Try a nearby landmark.</p>
            )}
          </div>
        )}
      </div>

      {selected && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <Check size={13} strokeWidth={3} /> Location captured
        </p>
      )}
      {lookupError && !selected && <p className="text-xs text-danger">{lookupError}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
