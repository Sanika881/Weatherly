import {AlertCircle, MapPin, RefreshCw, Search, WifiOff, X} from 'lucide-react';
import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {useDebounce} from '../hooks/useDebounce';
import {
  getSearchErrorMessage,
  hasOpenWeatherKey,
  type WeatherProviderId,
  weatherService,
} from '../services/weatherService';
import type {CityLocation, GeocodedPlace, SearchFailureReason} from '../types/weather';

interface SearchBarProps {
  onSelectCity: (city: CityLocation) => void;
  preferredProvider?: WeatherProviderId;
}

function formatSuggestionExample(rawQuery: string): string {
  const clean = rawQuery.trim();
  if (!clean) return 'London, GB';
  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)}, IN`;
}

export function SearchBar({onSelectCity, preferredProvider}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [failureReason, setFailureReason] = useState<SearchFailureReason | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retryTick, setRetryTick] = useState(0);

  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeqRef = useRef(0);
  const listboxId = useId();
  const showDevMissingKey = import.meta.env.DEV && !hasOpenWeatherKey();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeSearch = useCallback(
    async (searchText: string, signal: AbortSignal) => {
      const seq = ++requestSeqRef.current;
      setIsSearching(true);
      setFailureReason(null);

      try {
        const res = await weatherService.searchCities(searchText, {
          signal,
          preferredProvider,
        });
        if (signal.aborted || seq !== requestSeqRef.current) return;

        if (res.ok) {
          setResults(res.places);
          setActiveIndex(res.places.length > 0 ? 0 : -1);
          setFailureReason(null);
        } else {
          setResults([]);
          setActiveIndex(-1);
          setFailureReason(res.reason);
        }
        setIsOpen(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (signal.aborted || seq !== requestSeqRef.current) return;
        setResults([]);
        setFailureReason('network');
        setIsOpen(true);
      } finally {
        if (!signal.aborted && seq === requestSeqRef.current) {
          setIsSearching(false);
        }
      }
    },
    [preferredProvider]
  );

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      requestSeqRef.current++;
      setResults([]);
      setFailureReason(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    executeSearch(trimmed, controller.signal);

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, retryTick, executeSearch]);

  const handleChoose = (place: GeocodedPlace) => {
    onSelectCity({
      id: place.id,
      name: place.name,
      region: place.region,
      state: place.region,
      country: place.country,
      lat: place.lat,
      lon: place.lon,
    });
    setQuery('');
    setResults([]);
    setFailureReason(null);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      if (results.length > 0 || failureReason || query.trim().length >= 2) {
        setIsOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) {
        setActiveIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) {
        setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
      }
    } else if (event.key === 'Enter' && isOpen && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      handleChoose(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const trimmedQuery = query.trim();

  return (
    <div ref={containerRef} className="relative z-50 w-full max-w-md">
      <div className="relative flex items-center">
        <Search
          className="w-4 h-4 text-[#475569] absolute left-4 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search city"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          placeholder="Search city or region..."
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (val.trim().length >= 2) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
          }}
          onFocus={() => {
            if (trimmedQuery.length >= 2 || results.length > 0 || failureReason) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full h-11 pl-10 pr-10 rounded-full border border-white/80 bg-white/90 text-sm text-[#0F1B3D] placeholder:text-[#64748B] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
        />
        {trimmedQuery.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setFailureReason(null);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-3 w-7 h-7 rounded-full flex items-center justify-center text-[#475569] hover:text-[#0F1B3D] hover:bg-slate-900/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Floating Dropdown Panel: 8px below input (mt-2), rounded-2xl, z-50 */}
      {isOpen && trimmedQuery.length >= 2 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 mt-2 z-50 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,27,61,0.18)] p-2 max-h-72 overflow-y-auto"
        >
          {isSearching ? (
            <div aria-label="Searching cities" className="space-y-1.5 p-1">
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="h-11 rounded-xl bg-slate-100 animate-pulse flex items-center justify-between px-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-slate-200" />
                    <div className="h-3.5 w-28 rounded-full bg-slate-200" />
                  </div>
                  <div className="h-3 w-20 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          ) : failureReason ? (
            <div className="p-3 flex items-start justify-between gap-3 text-sm text-[#0F1B3D]">
              <div className="flex items-start gap-2.5 min-w-0">
                {failureReason === 'network' ? (
                  <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <p className="text-xs sm:text-sm text-[#334155] leading-snug">
                  {getSearchErrorMessage(failureReason)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRetryTick((t) => t + 1)}
                className="px-3 py-1.5 rounded-full bg-[#0F1B3D] text-white text-xs font-medium inline-flex items-center gap-1 shrink-0 hover:bg-[#1E293B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316]"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                <span>Retry</span>
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="px-3.5 py-3 text-xs sm:text-sm text-[#475569]">
              No cities found for &apos;{trimmedQuery}&apos;. Try adding a country, e.g.{' '}
              {formatSuggestionExample(trimmedQuery)}.
            </div>
          ) : (
            <ul className="space-y-1">
              {results.map((place, idx) => {
                const isSelected = idx === activeIndex;
                const regionCountry = [place.region, place.country].filter(Boolean).join(', ');
                return (
                  <li
                    key={place.id}
                    id={`${listboxId}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <button
                      type="button"
                      onClick={() => handleChoose(place)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F97316] ${
                        isSelected
                          ? 'bg-[#0F1B3D] text-white'
                          : 'text-[#0F1B3D] hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <MapPin
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-[#F97316]' : 'text-[#64748B]'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="font-medium truncate">{place.name}</span>
                      </span>
                      {regionCountry && (
                        <span
                          className={`text-xs truncate max-w-[48%] ${
                            isSelected ? 'text-slate-300' : 'text-[#64748B]'
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

          {showDevMissingKey && (
            <div className="mt-1.5 pt-1.5 px-2 border-t border-slate-200 text-[11px] text-[#64748B]">
              API key missing: restart the dev server after adding it
            </div>
          )}
        </div>
      )}
    </div>
  );
}
