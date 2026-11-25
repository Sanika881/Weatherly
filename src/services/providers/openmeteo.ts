import type {
  BigDataCloudReverseGeoResponse,
  OpenMeteoAirQualityResponse,
  OpenMeteoForecastResponse,
  OpenMeteoGeoResponse,
} from '../../types/api';
import type {
  CityLocation,
  GeocodedPlace,
  SearchCitiesResult,
  WeatherBundle,
  WeatherError,
} from '../../types/weather';
import {mapOpenMeteoToBundle} from '../mappers';

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {signal});
  if (!response.ok) {
    const err: WeatherError =
      response.status === 429
        ? {type: 'rate_limit', message: 'Weather rate limit reached. Please try again shortly.'}
        : {type: 'network', message: `Weather service returned HTTP ${response.status}.`};
    throw err;
  }
  return (await response.json()) as T;
}

export async function reverseGeocodeOpenMeteo(
  lat: number,
  lon: number
): Promise<{name: string; region?: string; country: string; state?: string}> {
  try {
    const url = `https://api.bigdatacloud.net/data/2.1/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const data = await fetchJson<BigDataCloudReverseGeoResponse>(url);
    const primary = data.locality || data.city || data.principalSubdivision;
    const secondary =
      data.city && data.city !== primary
        ? data.city
        : data.principalSubdivision && data.principalSubdivision !== primary
        ? data.principalSubdivision
        : undefined;
    if (primary) {
      return {
        name: primary,
        region: secondary,
        state: secondary,
        country: data.countryCode || '',
      };
    }
  } catch {
    // Graceful coordinate fallback
  }
  return {
    name: `Nearby (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
    country: '',
  };
}

export async function fetchOpenMeteoBundle(
  lat: number,
  lon: number,
  locationOverride?: Partial<CityLocation>
): Promise<WeatherBundle> {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,weather_code,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,uv_index,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max` +
    `&timezone=auto&forecast_days=7`;

  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&current=european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,carbon_monoxide`;

  const needsReverseGeo =
    !locationOverride?.name ||
    locationOverride.name === 'Current Location' ||
    locationOverride.name === 'Your location';

  const [forecastRes, airRes, geoRes] = await Promise.allSettled([
    fetchJson<OpenMeteoForecastResponse>(forecastUrl),
    fetchJson<OpenMeteoAirQualityResponse>(airUrl),
    needsReverseGeo ? reverseGeocodeOpenMeteo(lat, lon) : Promise.resolve(null),
  ]);

  if (forecastRes.status === 'rejected') {
    throw forecastRes.reason;
  }

  const resolvedGeo =
    geoRes.status === 'fulfilled' && geoRes.value ? geoRes.value : null;

  const location: CityLocation = {
    id: `${lat.toFixed(3)},${lon.toFixed(3)}`,
    name:
      (!needsReverseGeo && locationOverride?.name) ||
      resolvedGeo?.name ||
      `Nearby (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
    region: locationOverride?.region || locationOverride?.state || resolvedGeo?.region,
    state: locationOverride?.state || resolvedGeo?.state,
    country: locationOverride?.country || resolvedGeo?.country || '',
    lat,
    lon,
  };

  return mapOpenMeteoToBundle({
    location,
    forecast: forecastRes.value,
    airQuality: airRes.status === 'fulfilled' ? airRes.value : null,
  });
}

export async function searchOpenMeteoCities(
  query: string,
  signal?: AbortSignal
): Promise<SearchCitiesResult> {
  const trimmed = query.trim();
  if (!trimmed) return {ok: true, places: []};
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=5&language=en&format=json`;

  try {
    const response = await fetch(url, {signal});
    const text = await response.text();

    if (import.meta.env.DEV) {
      console.debug(
        `[Weatherly][Open-Meteo Geocoding] status=${response.status} query="${trimmed}" body=${text.slice(0, 300)}`
      );
    }

    if (!response.ok) {
      return {
        ok: false,
        reason: response.status === 429 ? 'rate_limit' : 'network',
      };
    }

    const data = JSON.parse(text) as OpenMeteoGeoResponse;
    const places: GeocodedPlace[] = (data.results ?? []).map((item) => ({
      id: `${item.latitude.toFixed(3)},${item.longitude.toFixed(3)}`,
      name: item.name,
      region: item.admin1,
      country: item.country_code || item.country || '',
      lat: item.latitude,
      lon: item.longitude,
    }));

    return {ok: true, places};
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (import.meta.env.DEV) {
      console.warn('[Weatherly][Open-Meteo Geocoding] network error:', err);
    }
    return {ok: false, reason: 'network'};
  }
}
