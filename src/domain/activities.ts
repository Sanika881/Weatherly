import {getCityLocalDate} from './time';
import type {WeatherBundle} from '../types/weather';

export interface WearItem {
  id: string;
  label: string;
  detail: string;
  kind: 'sunscreen' | 'umbrella' | 'jacket' | 'sunglasses' | 'water' | 'layers';
}

export interface ActivityScore {
  id: 'running' | 'laundry' | 'bbq' | 'stargazing' | 'cycling';
  label: string;
  score: number; // 0..100
  reason: string;
}

export function getFriendlyMicrocopy(weather: WeatherBundle): string {
  const {tempC, windKmh, icon, cloudCover} = weather.current;
  const maxRain = Math.max(0, ...weather.hourly.slice(0, 6).map((h) => h.precipProbability));

  if (icon === 'thunder') return 'The sky is practicing for a drama';
  if (icon === 'rain' || maxRain >= 65) return 'Keep an umbrella close today';
  if (icon === 'snow') return 'Quiet snow light — layer up warmly';
  if (tempC >= 30) return 'Warm sun ahead — stay hydrated';
  if ((icon === 'clear-day' || icon === 'partly-cloudy') && (weather.uv?.index ?? 0) >= 3) {
    return 'Sunglasses weather';
  }
  if (windKmh >= 18 && windKmh <= 32 && maxRain < 20) {
    return 'Perfect hair-drying wind';
  }
  if (!weather.current.isDay && cloudCover < 30) {
    return 'Crisp night for stargazing';
  }
  if (tempC >= 18 && tempC <= 25 && cloudCover < 50) {
    return 'Effortlessly calm outdoor weather';
  }
  return 'Steady skies with mild air';
}

export function computeWearAdvice(weather: WeatherBundle): WearItem[] {
  const {tempC, windKmh, icon} = weather.current;
  const uv = weather.uv?.index ?? 0;
  const maxRain = Math.max(0, ...weather.hourly.slice(0, 8).map((h) => h.precipProbability));

  const items: WearItem[] = [];

  if (icon === 'rain' || icon === 'thunder' || maxRain >= 35) {
    items.push({
      id: 'umbrella',
      label: 'Umbrella',
      detail: `${maxRain}% chance of showers`,
      kind: 'umbrella',
    });
  }

  if (uv >= 3 && weather.current.isDay) {
    items.push({
      id: 'sunscreen',
      label: 'SPF 30+ sunscreen',
      detail: `UV index ${uv}`,
      kind: 'sunscreen',
    });
  }

  if ((icon === 'clear-day' || icon === 'partly-cloudy') && weather.current.isDay) {
    items.push({
      id: 'sunglasses',
      label: 'Sunglasses',
      detail: 'Bright glare expected',
      kind: 'sunglasses',
    });
  }

  if (tempC < 10) {
    items.push({
      id: 'layers',
      label: 'Warm coat & scarf',
      detail: 'Chilly temperatures',
      kind: 'layers',
    });
  } else if (tempC < 18 || windKmh >= 22) {
    items.push({
      id: 'jacket',
      label: 'Light jacket',
      detail: windKmh >= 22 ? 'Breezy gusts out' : 'Cool air',
      kind: 'jacket',
    });
  }

  if (tempC >= 23 || items.length < 3) {
    items.push({
      id: 'water',
      label: 'Water bottle',
      detail: tempC >= 25 ? 'Extra hydration needed' : 'Daily hydration',
      kind: 'water',
    });
  }

  return items.slice(0, 4);
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(5, Math.min(100, Math.round(n)));
}

export function computeActivityScores(weather: WeatherBundle): ActivityScore[] {
  const {tempC, windKmh, humidity, cloudCover} = weather.current;
  const rainProb = Math.max(0, ...weather.hourly.slice(0, 6).map((h) => h.precipProbability));
  const aqi = weather.airQuality?.index ?? 1;
  const uv = weather.uv?.index ?? 2;

  // Running: ideal 10-20C, low rain, clean air
  const runTempPenalty = Math.abs(tempC - 15) * 2.2;
  const runScore = clampScore(100 - runTempPenalty - rainProb * 0.6 - (aqi - 1) * 14 - Math.max(0, windKmh - 25));
  const runReason =
    runScore >= 75
      ? 'Cool air and low rain make pacing comfortable.'
      : rainProb > 45
      ? 'Higher rain probability may make paths slick.'
      : aqi >= 3
      ? 'Moderate air quality — keep intensity gentle.'
      : 'Warm or breezy conditions; pace accordingly.';

  // Laundry drying: warm, breezy, low humidity, no rain
  const laundryScore = clampScore(
    90 - rainProb * 0.9 - Math.max(0, humidity - 55) * 0.8 + Math.min(20, windKmh * 0.8) + (tempC > 16 ? 8 : -10)
  );
  const laundryReason =
    rainProb >= 40
      ? 'Rain risk means drying indoors is safer.'
      : windKmh >= 12 && humidity < 65
      ? 'Good airflow and dry air speed up drying.'
      : 'Mild airflow; allow a bit more drying time.';

  // BBQ: 18-28C, dry, calm wind
  const bbqScore = clampScore(
    98 - Math.abs(tempC - 23) * 2.5 - rainProb * 0.85 - Math.max(0, windKmh - 18) * 1.6
  );
  const bbqReason =
    bbqScore >= 75
      ? 'Warm, dry, and calm enough for grilling outdoors.'
      : rainProb >= 40
      ? 'Rain likelihood could interrupt outdoor dining.'
      : 'Cooler temperatures or breeze outside.' ;

  // Stargazing: low cloud cover, no rain, clean air
  const starScore = clampScore(100 - cloudCover * 0.85 - rainProb * 0.5 - (aqi - 1) * 8);
  const starReason =
    cloudCover <= 25
      ? 'Clear skies tonight offer crisp star visibility.'
      : cloudCover <= 60
      ? 'Partly cloudy breaks between stars.'
      : 'Heavy cloud cover obscures night sky.';

  // Cycling: dry, moderate wind, clean air, moderate UV
  const cycleScore = clampScore(
    96 - Math.abs(tempC - 18) * 2 - rainProb * 0.7 - Math.max(0, windKmh - 16) * 2.1 - (aqi - 1) * 12 - Math.max(0, uv - 8) * 4
  );
  const cycleReason =
    windKmh > 26
      ? 'Strong headwinds will add resistance.'
      : rainProb > 40
      ? 'Wet roads likely — take corners gently.'
      : 'Smooth visibility and steady riding air.';

  return [
    {id: 'running', label: 'Running', score: runScore, reason: runReason},
    {id: 'laundry', label: 'Laundry', score: laundryScore, reason: laundryReason},
    {id: 'bbq', label: 'BBQ', score: bbqScore, reason: bbqReason},
    {id: 'stargazing', label: 'Stargazing', score: starScore, reason: starReason},
    {id: 'cycling', label: 'Cycling', score: cycleScore, reason: cycleReason},
  ];
}

export function isWeekendClearAndMild(weather: WeatherBundle): boolean {
  return weather.daily.some((day) => {
    const d = getCityLocalDate(day.timestamp, weather.timezoneOffsetSec);
    const weekday = d.getUTCDay(); // 0 = Sun, 6 = Sat
    const isWeekend = weekday === 0 || weekday === 6;
    const isClear = day.icon === 'clear-day' || day.icon === 'partly-cloudy';
    const isMild = day.maxC >= 18 && day.maxC <= 26;
    return isWeekend && isClear && isMild;
  });
}
