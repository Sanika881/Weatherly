import type {UvData, UvLevel} from '../types/weather';

export interface UvMeta {
  level: UvLevel;
  advice: string;
  color: string;
  ratio: number; // 0..1 clamped on 0..11+ scale
}

export function getUvMeta(uvi: number): UvMeta {
  const safeUvi = Number.isFinite(uvi) ? uvi : 0;
  const clamped = Math.max(0, safeUvi);
  const ratio = Math.min(1, clamped / 11);

  if (clamped < 3) {
    return {
      level: 'Low',
      advice: 'Minimal protection required.',
      color: '#22C55E',
      ratio,
    };
  }
  if (clamped < 6) {
    return {
      level: 'Moderate',
      advice: 'Wear sunglasses and SPF 30+ at midday.',
      color: '#EAB308',
      ratio,
    };
  }
  if (clamped < 8) {
    return {
      level: 'High',
      advice: 'Seek shade between 10 AM and 4 PM.',
      color: '#F97316',
      ratio,
    };
  }
  if (clamped < 11) {
    return {
      level: 'Very High',
      advice: 'Extra sun protection essential.',
      color: '#EF4444',
      ratio,
    };
  }
  return {
    level: 'Extreme',
    advice: 'Avoid direct sun exposure.',
    color: '#A855F7',
    ratio,
  };
}

export function toUvData(uvi: number): UvData {
  const safe = Number.isFinite(uvi) ? uvi : 0;
  const rounded = Math.round(Math.max(0, safe) * 10) / 10;
  const meta = getUvMeta(rounded);
  return {
    index: rounded,
    level: meta.level,
    advice: meta.advice,
  };
}
