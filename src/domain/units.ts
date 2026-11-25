import type {TemperatureUnit} from '../types/weather';

export function convertTemp(tempC: number, unit: TemperatureUnit): number {
  if (unit === 'F') {
    return Math.round((tempC * 9) / 5 + 32);
  }
  return Math.round(tempC);
}

export function formatTemp(tempC: number, unit: TemperatureUnit, withUnit = false): string {
  const value = convertTemp(tempC, unit);
  return withUnit ? `${value}°${unit}` : `${value}°`;
}

export function convertSpeed(kmh: number, unit: TemperatureUnit): number {
  if (unit === 'F') {
    return Math.round(kmh * 0.621371);
  }
  return Math.round(kmh);
}

export function formatSpeed(kmh: number, unit: TemperatureUnit): string {
  const value = convertSpeed(kmh, unit);
  return unit === 'F' ? `${value} mph` : `${value} km/h`;
}

export function convertVisibility(km: number, unit: TemperatureUnit): number {
  const value = unit === 'F' ? km * 0.621371 : km;
  return Math.round(value * 10) / 10;
}

export function formatVisibility(km: number, unit: TemperatureUnit): string {
  const value = convertVisibility(km, unit);
  return unit === 'F' ? `${value} mi` : `${value} km`;
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function degreesToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 45) % 8;
  return COMPASS_POINTS[idx];
}
