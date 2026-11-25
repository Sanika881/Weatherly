import type {AqiBand} from '../types/weather';

export interface AqiMeta {
  index: 1 | 2 | 3 | 4 | 5;
  band: AqiBand;
  description: string;
  barColor: string;
  badgeTextClass: string;
  percent: number;
}

const AQI_META_MAP: Record<1 | 2 | 3 | 4 | 5, Omit<AqiMeta, 'index'>> = {
  1: {
    band: 'Good',
    description: 'Clean, crisp air ideal for outdoor activity.',
    barColor: '#22C55E',
    badgeTextClass: 'text-emerald-300',
    percent: 20,
  },
  2: {
    band: 'Fair',
    description: 'Acceptable air quality with minimal sensitivity.',
    barColor: '#84CC16',
    badgeTextClass: 'text-lime-300',
    percent: 40,
  },
  3: {
    band: 'Moderate',
    description: 'Sensitive groups should limit prolonged exertion.',
    barColor: '#F59E0B',
    badgeTextClass: 'text-amber-300',
    percent: 60,
  },
  4: {
    band: 'Poor',
    description: 'Consider reducing extended outdoor exertion.',
    barColor: '#F97316',
    badgeTextClass: 'text-orange-300',
    percent: 80,
  },
  5: {
    band: 'Very Poor',
    description: 'Health alert: avoid strenuous outdoor activity.',
    barColor: '#EF4444',
    badgeTextClass: 'text-rose-300',
    percent: 100,
  },
};

export function getAqiMeta(index: 1 | 2 | 3 | 4 | 5): AqiMeta {
  return {
    index,
    ...AQI_META_MAP[index],
  };
}

export function mapEuAqiToScale(euAqi: number): 1 | 2 | 3 | 4 | 5 {
  if (euAqi <= 20) return 1;
  if (euAqi <= 40) return 2;
  if (euAqi <= 60) return 3;
  if (euAqi <= 80) return 4;
  return 5;
}
