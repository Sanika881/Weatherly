import type {WeatherBundle} from '../types/weather';

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const LAST_BUNDLE_STORAGE_KEY = 'weatherly_last_bundle_v2';

interface CacheEntry {
  bundle: WeatherBundle;
  expiresAt: number;
}

const bundleCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<WeatherBundle>>();

export function makeCoordsCacheKey(lat: number, lon: number, provider: string): string {
  return `${provider}:${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export function getCachedBundle(key: string): WeatherBundle | null {
  const entry = bundleCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    bundleCache.delete(key);
    return null;
  }
  return entry.bundle;
}

export function setCachedBundle(key: string, bundle: WeatherBundle): void {
  bundleCache.set(key, {
    bundle,
    expiresAt: Date.now() + TTL_MS,
  });
  try {
    localStorage.setItem(LAST_BUNDLE_STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    // Ignore storage quota/blocked errors gracefully
  }
}

export function getLastPersistedBundle(): WeatherBundle | null {
  try {
    const raw = localStorage.getItem(LAST_BUNDLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherBundle;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.current ||
      !Array.isArray(parsed.daily)
    ) {
      return null;
    }
    return {...parsed, isStale: true};
  } catch {
    return null;
  }
}

export function getInFlight(key: string): Promise<WeatherBundle> | undefined {
  return inFlightRequests.get(key);
}

export function setInFlight(key: string, promise: Promise<WeatherBundle>): void {
  inFlightRequests.set(key, promise);
}

export function clearInFlight(key: string): void {
  inFlightRequests.delete(key);
}

export function clearMemoryCache(): void {
  bundleCache.clear();
}
