import type {
  CityLocation,
  SearchCitiesResult,
  SearchFailureReason,
  WeatherBundle,
} from '../types/weather';
import {
  clearInFlight,
  getCachedBundle,
  getInFlight,
  getLastPersistedBundle,
  makeCoordsCacheKey,
  setCachedBundle,
  setInFlight,
} from './cache';
import {fetchOpenMeteoBundle, searchOpenMeteoCities} from './providers/openmeteo';
import {fetchOpenWeatherBundle, searchOpenWeatherCities} from './providers/openweather';

export type WeatherProviderId = 'openweather' | 'open-meteo';

function getOpenWeatherKey(): string {
  return (import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined)?.trim() ?? '';
}

export function hasOpenWeatherKey(): boolean {
  return getOpenWeatherKey().length > 0;
}

export function resolveActiveProvider(preferred?: WeatherProviderId): WeatherProviderId {
  if (preferred === 'open-meteo') return 'open-meteo';
  if (hasOpenWeatherKey()) return 'openweather';
  return 'open-meteo';
}

export function getSearchErrorMessage(reason: SearchFailureReason): string {
  switch (reason) {
    case 'auth':
      return "Weather key isn't active yet. New keys can take up to 2 hours.";
    case 'rate_limit':
      return 'Too many searches, try again in a minute.';
    case 'network':
      return 'You appear to be offline.';
    default:
      return 'Search ran into an unexpected error. Please try again.';
  }
}

export const weatherService = {
  async getBundle(
    lat: number,
    lon: number,
    options?: {
      locationOverride?: Partial<CityLocation>;
      forceRefresh?: boolean;
      preferredProvider?: WeatherProviderId;
    }
  ): Promise<WeatherBundle> {
    const provider = resolveActiveProvider(options?.preferredProvider);
    const key = makeCoordsCacheKey(lat, lon, provider);

    if (!options?.forceRefresh) {
      const cached = getCachedBundle(key);
      if (cached) {
        return {
          ...cached,
          location: options?.locationOverride?.name
            ? {...cached.location, ...options.locationOverride}
            : cached.location,
        };
      }

      const pending = getInFlight(key);
      if (pending) return pending;
    }

    const request = (async () => {
      try {
        const apiKey = getOpenWeatherKey();
        const bundle =
          provider === 'openweather' && apiKey
            ? await fetchOpenWeatherBundle(lat, lon, apiKey, options?.locationOverride)
            : await fetchOpenMeteoBundle(lat, lon, options?.locationOverride);

        setCachedBundle(key, bundle);
        return bundle;
      } catch (err) {
        // Fallback to Open-Meteo if OpenWeather bundle fails (e.g., new key not active yet)
        if (provider === 'openweather') {
          try {
            const fallbackBundle = await fetchOpenMeteoBundle(lat, lon, options?.locationOverride);
            setCachedBundle(key, fallbackBundle);
            return fallbackBundle;
          } catch {
            // Continue to offline fallback
          }
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const offlineBundle = getLastPersistedBundle();
          if (offlineBundle) return offlineBundle;
        }
        throw err;
      } finally {
        clearInFlight(key);
      }
    })();

    setInFlight(key, request);
    return request;
  },

  async searchCities(
    query: string,
    options?: {signal?: AbortSignal; preferredProvider?: WeatherProviderId}
  ): Promise<SearchCitiesResult> {
    const provider = resolveActiveProvider(options?.preferredProvider);
    const apiKey = getOpenWeatherKey();

    if (provider === 'openweather' && apiKey) {
      const owmResult = await searchOpenWeatherCities(query, apiKey, options?.signal);
      if (owmResult.ok) return owmResult;

      // Fallback: if OpenWeather fails with auth or network error, retry with Open-Meteo
      if (owmResult.reason === 'auth' || owmResult.reason === 'network') {
        const fallbackResult = await searchOpenMeteoCities(query, options?.signal);
        if (fallbackResult.ok) return fallbackResult;
        // Preserve the informative OpenWeather error if Open-Meteo also fails
        return owmResult;
      }
      return owmResult;
    }

    return searchOpenMeteoCities(query, options?.signal);
  },
};
