import {AlertCircle, Clock, LocateFixed, MapPin, RefreshCw, Search, Thermometer, WifiOff, X} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useDebounce} from '../hooks/useDebounce';
import {
  getSearchErrorMessage,
  type WeatherProviderId,
  weatherService,
} from '../services/weatherService';
import type {CityLocation, GeocodedPlace, SearchFailureReason, TemperatureUnit} from '../types/weather';

interface CommandPaletteProps {
  recentCities: CityLocation[];
  unit: TemperatureUnit;
  preferredProvider?: WeatherProviderId;
  onSelectCity: (city: CityLocation) => void;
  onUseMyLocation: () => void;
  onToggleUnit: () => void;
  onClose: () => void;
}

export default function CommandPalette({
  recentCities,
  unit,
  preferredProvider,
  onSelectCity,
  onUseMyLocation,
  onToggleUnit,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [failureReason, setFailureReason] = useState<SearchFailureReason | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [retryTick, setRetryTick] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);
  const debounced = useDebounce(query, 300);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runSearch = useCallback(
    async (text: string, signal: AbortSignal) => {
      const seq = ++seqRef.current;
      setIsSearching(true);
      setFailureReason(null);
      try {
        const res = await weatherService.searchCities(text, {signal, preferredProvider});
        if (signal.aborted || seq !== seqRef.current) return;
        if (res.ok) {
          setResults(res.places);
          setActiveIdx(0);
        } else {
          setResults([]);
          setFailureReason(res.reason);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (signal.aborted || seq !== seqRef.current) return;
        setResults([]);
        setFailureReason('network');
      } finally {
        if (!signal.aborted && seq === seqRef.current) {
          setIsSearching(false);
        }
      }
    },
    [preferredProvider]
  );

  useEffect(() => {
    const trimmed = debounced.trim();
    if (trimmed.length < 2) {
      seqRef.current++;
      setResults([]);
      setFailureReason(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    runSearch(trimmed, controller.signal);
    return () => controller.abort();
  }, [debounced, retryTick, runSearch]);

  const listItems: CityLocation[] =
    query.trim().length >= 2
      ? results.map((p) => ({
          id: p.id,
          name: p.name,
          region: p.region,
          state: p.region,
          country: p.country,
          lat: p.lat,
          lon: p.lon,
        }))
      : recentCities;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (listItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % listItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + listItems.length) % listItems.length);
    } else if (e.key === 'Enter' && listItems[activeIdx]) {
      e.preventDefault();
      onSelectCity(listItems[activeIdx]);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onKeyDown={handleKeyDown}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-[#0F1B3D]/50 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white text-[#0F1B3D] shadow-[0_24px_64px_rgba(15,27,61,0.3)] border border-white/80 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200">
          <Search className="w-4 h-4 text-[#F97316] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to city or command..."
            aria-label="Search city or command"
            className="flex-1 bg-transparent text-sm text-[#0F1B3D] placeholder:text-[#64748B] focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto space-y-2">
          <div className="px-3 pt-1 text-[11px] font-semibold text-[#64748B]">
            {query.trim().length >= 2
              ? isSearching
                ? 'Searching locations…'
                : 'Search results'
              : 'Recent cities'}
          </div>

          {isSearching ? (
            <div className="space-y-1.5 p-1">
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="h-10 rounded-xl bg-slate-100 animate-pulse px-3 flex items-center justify-between"
                >
                  <div className="h-3.5 w-28 rounded-full bg-slate-200" />
                  <div className="h-3 w-16 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          ) : failureReason ? (
            <div className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#334155]">
                {failureReason === 'network' ? (
                  <WifiOff className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#F97316] shrink-0" aria-hidden="true" />
                )}
                <span>{getSearchErrorMessage(failureReason)}</span>
              </div>
              <button
                type="button"
                onClick={() => setRetryTick((t) => t + 1)}
                className="px-3 py-1.5 rounded-full bg-[#0F1B3D] text-white text-xs font-medium inline-flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                <span>Retry</span>
              </button>
            </div>
          ) : listItems.length === 0 ? (
            <div className="px-3 py-4 text-sm text-[#475569]">
              {query.trim().length >= 2
                ? `No cities found for '${query.trim()}'. Try adding a country, e.g. ${query.trim()}, IN.`
                : 'Search for any city worldwide.'}
            </div>
          ) : (
            <ul role="listbox" className="space-y-1">
              {listItems.map((city, idx) => {
                const selected = idx === activeIdx;
                const regionCountry = [city.region || city.state, city.country]
                  .filter(Boolean)
                  .join(', ');
                return (
                  <li key={city.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCity(city);
                        onClose();
                      }}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-sm text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
                        selected ? 'bg-[#0F1B3D] text-white' : 'hover:bg-slate-100 text-[#0F1B3D]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        {query.trim().length >= 2 ? (
                          <MapPin
                            className={`w-4 h-4 shrink-0 ${
                              selected ? 'text-[#F97316]' : 'text-[#64748B]'
                            }`}
                            aria-hidden="true"
                          />
                        ) : (
                          <Clock
                            className={`w-4 h-4 shrink-0 ${
                              selected ? 'text-[#F97316]' : 'text-[#64748B]'
                            }`}
                            aria-hidden="true"
                          />
                        )}
                        <span className="font-medium truncate">{city.name}</span>
                      </span>
                      {regionCountry && (
                        <span
                          className={`text-xs shrink-0 ${
                            selected ? 'text-slate-300' : 'text-[#64748B]'
                          }`}
                        >
                          {regionCountry}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 px-1 pb-1">
            <button
              type="button"
              onClick={() => {
                onUseMyLocation();
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-[#0F1B3D]"
            >
              <LocateFixed className="w-3.5 h-3.5 text-[#F97316]" aria-hidden="true" />
              <span>Use my location</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleUnit();
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-[#0F1B3D]"
            >
              <Thermometer className="w-3.5 h-3.5 text-[#F97316]" aria-hidden="true" />
              <span>Switch to °{unit === 'C' ? 'F' : 'C'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
