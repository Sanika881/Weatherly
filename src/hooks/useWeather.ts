import {useCallback, useEffect, useState} from 'react';
import {getLastPersistedBundle} from '../services/cache';
import {type WeatherProviderId, weatherService} from '../services/weatherService';
import type {CityLocation, WeatherBundle, WeatherError, WeatherStatus} from '../types/weather';

interface UseWeatherResult {
  data: WeatherBundle | null;
  status: WeatherStatus;
  error: WeatherError | null;
  isOffline: boolean;
  refresh: () => void;
}

function toWeatherError(err: unknown): WeatherError {
  if (err && typeof err === 'object' && 'type' in err && 'message' in err) {
    return err as WeatherError;
  }
  return {
    type: 'network',
    message: 'Unable to load weather forecast right now. Please try again.',
  };
}

export function useWeather(
  location: CityLocation,
  preferredProvider?: WeatherProviderId
): UseWeatherResult {
  const [data, setData] = useState<WeatherBundle | null>(null);
  const [status, setStatus] = useState<WeatherStatus>('loading');
  const [error, setError] = useState<WeatherError | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setError(null);

      try {
        const bundle = await weatherService.getBundle(location.lat, location.lon, {
          locationOverride:
            location.name &&
            location.name !== 'Current Location' &&
            location.name !== 'Your location'
              ? location
              : undefined,
          forceRefresh: refreshTick > 0,
          preferredProvider,
        });

        if (cancelled) return;
        setData(bundle);
        setStatus('success');
      } catch (err) {
        if (cancelled) return;
        const offlineFallback = getLastPersistedBundle();
        if (offlineFallback) {
          setData(offlineFallback);
          setStatus('success');
          setError({
            type: 'partial',
            message: 'Showing last saved forecast while offline.',
          });
        } else {
          setError(toWeatherError(err));
          setStatus('error');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lon, location.name, location.country, preferredProvider, refreshTick]);

  return {data, status, error, isOffline, refresh};
}
