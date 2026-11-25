import {useEffect, useState} from 'react';
import {type WeatherProviderId, weatherService} from '../services/weatherService';
import type {CityLiveSnapshot, SavedCity} from '../types/weather';

export function useSavedCitiesWeather(
  cities: SavedCity[],
  preferredProvider?: WeatherProviderId
): Record<string, CityLiveSnapshot> {
  const [snapshots, setSnapshots] = useState<Record<string, CityLiveSnapshot>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadCity(city: SavedCity) {
      setSnapshots((prev) => ({
        ...prev,
        [city.id]: {
          cityId: city.id,
          tempC: city.lastTempC ?? 18,
          highC: city.lastHighC ?? 20,
          lowC: city.lastLowC ?? 12,
          condition: city.lastCondition ?? 'Loading',
          icon: city.lastIcon ?? 'partly-cloudy',
          timezoneOffsetSec: 0,
          sparkline: [],
          loading: !prev[city.id],
        },
      }));

      try {
        const bundle = await weatherService.getBundle(city.lat, city.lon, {
          locationOverride: city,
          preferredProvider,
        });
        if (cancelled) return;
        setSnapshots((prev) => ({
          ...prev,
          [city.id]: {
            cityId: city.id,
            tempC: bundle.current.tempC,
            highC: bundle.current.maxC,
            lowC: bundle.current.minC,
            condition: bundle.current.condition,
            icon: bundle.current.icon,
            timezoneOffsetSec: bundle.timezoneOffsetSec,
            sparkline: bundle.hourly.slice(0, 8).map((h) => h.tempC),
            aqiIndex: bundle.airQuality?.index,
            precipProbability: bundle.daily[0]?.precipProbability ?? 0,
            windKmh: bundle.current.windKmh,
            loading: false,
          },
        }));
      } catch {
        if (cancelled) return;
        setSnapshots((prev) => ({
          ...prev,
          [city.id]: {
            ...(prev[city.id] ?? {
              cityId: city.id,
              tempC: city.lastTempC ?? 18,
              highC: city.lastHighC ?? 20,
              lowC: city.lastLowC ?? 12,
              condition: city.lastCondition ?? 'Saved',
              icon: city.lastIcon ?? 'partly-cloudy',
              timezoneOffsetSec: 0,
              sparkline: [],
            }),
            loading: false,
          },
        }));
      }
    }

    for (const city of cities) {
      loadCity(city);
    }

    return () => {
      cancelled = true;
    };
  }, [cities, preferredProvider]);

  return snapshots;
}
