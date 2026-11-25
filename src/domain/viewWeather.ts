import {toUvData} from './uv';
import type {WeatherBundle} from '../types/weather';

export interface FeelsLikeFactor {
  label: string;
  deltaC: number;
}

export function computeFeelsLikeFactors(params: {
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKmh: number;
  cloudCover: number;
  isDay: boolean;
}): FeelsLikeFactor[] {
  const {tempC, feelsLikeC, humidity, windKmh, cloudCover, isDay} = params;
  const totalDelta = Math.round((feelsLikeC - tempC) * 10) / 10;

  // Derive physically intuitive factor breakdown that sums closely to totalDelta
  const humidityEffect =
    humidity >= 60 && tempC >= 20
      ? Math.round(((humidity - 55) / 15) * 10) / 10
      : humidity <= 30 && tempC <= 15
      ? -0.5
      : 0;

  const windEffect =
    windKmh >= 10
      ? -Math.min(4.5, Math.round(((windKmh - 8) / 10) * 10) / 10)
      : 0;

  const sunEffect =
    isDay && cloudCover < 40 && tempC >= 15
      ? Math.round((1 - cloudCover / 100) * 1.4 * 10) / 10
      : 0;

  const rawSum = humidityEffect + windEffect + sunEffect;
  const residual = Math.round((totalDelta - rawSum) * 10) / 10;

  const factors: FeelsLikeFactor[] = [
    {label: 'Humidity', deltaC: Math.round((humidityEffect + residual * 0.4) * 10) / 10},
    {label: 'Wind chill', deltaC: Math.round((windEffect + residual * 0.6) * 10) / 10},
  ];

  if (sunEffect !== 0) {
    factors.push({label: 'Solar warmth', deltaC: sunEffect});
  }

  return factors;
}

export function deriveViewedWeather(
  bundle: WeatherBundle | null,
  scrubIndex: number,
  options?: {stormActive?: boolean; forceNight?: boolean}
): WeatherBundle | null {
  if (!bundle) return null;

  let active = bundle;

  if (scrubIndex > 0 && bundle.hourly.length > 0) {
    const clampedIdx = Math.min(scrubIndex, bundle.hourly.length - 1);
    const point = bundle.hourly[clampedIdx];
    const prevPoint = bundle.hourly[Math.max(0, clampedIdx - 1)];
    const deltaP = point.pressureHpa - prevPoint.pressureHpa;

    active = {
      ...bundle,
      observedAt: point.timestamp,
      current: {
        ...bundle.current,
        tempC: point.tempC,
        feelsLikeC: point.feelsLikeC,
        humidity: point.humidity,
        pressureHpa: point.pressureHpa,
        pressureTrend: deltaP >= 1 ? 'rising' : deltaP <= -1 ? 'falling' : 'steady',
        windKmh: point.windKmh,
        windDeg: point.windDeg,
        windGustKmh: point.windGustKmh,
        visibilityKm: point.visibilityKm,
        cloudCover: point.cloudCover,
        condition: point.condition,
        description: point.description,
        icon: point.icon,
        isDay: point.isDay,
      },
      uv: toUvData(point.uvIndex),
    };
  }

  if (options?.stormActive) {
    active = {
      ...active,
      current: {
        ...active.current,
        icon: 'thunder',
        condition: 'Thunderstorm',
        description: 'Dramatic storm front passing through',
        cloudCover: 92,
        windKmh: Math.max(active.current.windKmh, 38),
      },
    };
  }

  if (options?.forceNight) {
    active = {
      ...active,
      current: {
        ...active.current,
        isDay: false,
        icon: active.current.icon === 'clear-day' ? 'clear-night' : active.current.icon,
      },
    };
  }

  return active;
}
