import type {
  OpenWeatherAirPollutionResponse,
  OpenWeatherCurrentResponse,
  OpenWeatherForecastResponse,
  OpenWeatherGeoDirectItem,
  OpenWeatherOneCallResponse,
} from '../../types/api';
import type {
  CityLocation,
  GeocodedPlace,
  SearchCitiesResult,
  SearchFailureReason,
  WeatherBundle,
  WeatherError,
} from '../../types/weather';
import {mapOpenWeatherToBundle} from '../mappers';

const OWM_BASE = 'https://api.openweathermap.org';

class ProviderHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {signal});
  if (!response.ok) {
    if (import.meta.env.DEV) {
      const body = await response.clone().text().catch(() => '');
      console.warn(`[Weatherly][OpenWeather] HTTP ${response.status} for ${url}:`, body);
    }
    throw new ProviderHttpError(response.status, `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export function classifyOwmError(err: unknown): WeatherError {
  if (err instanceof ProviderHttpError) {
    if (err.status === 429) {
      return {
        type: 'rate_limit',
        message: 'Weather API rate limit reached. Showing cached data if available.',
      };
    }
    if (err.status === 404) {
      return {
        type: 'not_found',
        message: 'Could not find weather telemetry for this location.',
      };
    }
    if (err.status === 401) {
      return {
        type: 'network',
        message: "Weather key isn't active yet. New keys can take up to 2 hours.",
      };
    }
  }
  return {
    type: 'network',
    message: 'Unable to reach weather service. Check your internet connection.',
  };
}

export async function reverseGeocodeOpenWeather(
  lat: number,
  lon: number,
  apiKey: string
): Promise<Partial<CityLocation> | null> {
  try {
    const url = `${OWM_BASE}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
    const items = await fetchJson<OpenWeatherGeoDirectItem[]>(url);
    const first = items[0];
    if (!first) return null;
    return {
      name: first.name,
      region: first.state,
      state: first.state,
      country: first.country,
    };
  } catch {
    return null;
  }
}

export async function fetchOpenWeatherBundle(
  lat: number,
  lon: number,
  apiKey: string,
  locationOverride?: Partial<CityLocation>
): Promise<WeatherBundle> {
  const weatherUrl = `${OWM_BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const forecastUrl = `${OWM_BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const airUrl = `${OWM_BASE}/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const oneCallUrl = `${OWM_BASE}/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=metric&appid=${apiKey}`;

  const needsReverseGeo =
    !locationOverride?.name ||
    locationOverride.name === 'Current Location' ||
    locationOverride.name === 'Your location';

  const [weatherRes, forecastRes, airRes, oneCallRes, reverseRes] = await Promise.allSettled([
    fetchJson<OpenWeatherCurrentResponse>(weatherUrl),
    fetchJson<OpenWeatherForecastResponse>(forecastUrl),
    fetchJson<OpenWeatherAirPollutionResponse>(airUrl),
    fetchJson<OpenWeatherOneCallResponse>(oneCallUrl),
    needsReverseGeo ? reverseGeocodeOpenWeather(lat, lon, apiKey) : Promise.resolve(null),
  ]);

  if (weatherRes.status === 'rejected') {
    throw classifyOwmError(weatherRes.reason);
  }

  const resolvedOverride =
    reverseRes.status === 'fulfilled' && reverseRes.value
      ? reverseRes.value
      : locationOverride;

  return mapOpenWeatherToBundle({
    locationOverride: resolvedOverride,
    current: weatherRes.value,
    forecast: forecastRes.status === 'fulfilled' ? forecastRes.value : null,
    airPollution: airRes.status === 'fulfilled' ? airRes.value : null,
    oneCall: oneCallRes.status === 'fulfilled' ? oneCallRes.value : null,
  });
}

export async function searchOpenWeatherCities(
  query: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<SearchCitiesResult> {
  const trimmed = query.trim();
  if (!trimmed) return {ok: true, places: []};

  const url = `${OWM_BASE}/geo/1.0/direct?q=${encodeURIComponent(trimmed)}&limit=5&appid=${apiKey}`;

  try {
    const response = await fetch(url, {signal});
    const text = await response.text();

    if (import.meta.env.DEV) {
      console.debug(
        `[Weatherly][OWM Geocoding] status=${response.status} query="${trimmed}" body=${text.slice(0, 300)}`
      );
    }

    if (!response.ok) {
      let reason: SearchFailureReason = 'unknown';
      if (response.status === 401 || response.status === 403) reason = 'auth';
      else if (response.status === 429) reason = 'rate_limit';
      else if (response.status >= 500) reason = 'network';
      return {ok: false, reason};
    }

    const items = JSON.parse(text) as OpenWeatherGeoDirectItem[];
    const places: GeocodedPlace[] = (Array.isArray(items) ? items : []).map((item) => ({
      id: `${item.lat.toFixed(3)},${item.lon.toFixed(3)}`,
      name: item.name,
      region: item.state,
      country: item.country,
      lat: item.lat,
      lon: item.lon,
    }));

    return {ok: true, places};
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (import.meta.env.DEV) {
      console.warn('[Weatherly][OWM Geocoding] network error:', err);
    }
    return {ok: false, reason: 'network'};
  }
}
