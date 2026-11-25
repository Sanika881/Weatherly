import {describe, expect, it} from 'vitest';
import {
  computeActivityScores,
  computeWearAdvice,
  getFriendlyMicrocopy,
  isWeekendClearAndMild,
} from '../activities';
import {getAqiMeta, mapEuAqiToScale} from '../aqi';
import {computeSkyPhase, getAtmosphere} from '../atmosphere';
import {getGoldenHourCountdown, getMoonPhase, getSunArcPosition} from '../celestial';
import {formatCityTime, getGreetingForOffset} from '../time';
import {
  convertSpeed,
  convertTemp,
  convertVisibility,
  degreesToCompass,
  formatTemp,
} from '../units';
import {getUvMeta, toUvData} from '../uv';
import {computeFeelsLikeFactors, deriveViewedWeather} from '../viewWeather';
import type {WeatherBundle} from '../../types/weather';

function makeMockBundle(overrides?: Partial<WeatherBundle>): WeatherBundle {
  const sunrise = 1_700_000_000;
  const sunset = sunrise + 12 * 3600;
  return {
    provider: 'openweather',
    location: {id: '1', name: 'London', country: 'GB', lat: 51.5, lon: -0.1},
    timezoneOffsetSec: 0,
    observedAt: sunrise + 4 * 3600,
    sunrise,
    sunset,
    fetchedAtMs: Date.now(),
    current: {
      tempC: 21,
      feelsLikeC: 20,
      minC: 14,
      maxC: 23,
      humidity: 52,
      pressureHpa: 1016,
      pressureTrend: 'steady',
      windKmh: 12,
      windDeg: 210,
      visibilityKm: 10,
      cloudCover: 15,
      condition: 'Sunny',
      description: 'Clear sky',
      icon: 'clear-day',
      isDay: true,
    },
    hourly: [
      {
        timestamp: sunrise + 4 * 3600,
        tempC: 21,
        feelsLikeC: 20,
        precipProbability: 5,
        windKmh: 12,
        windDeg: 210,
        humidity: 52,
        pressureHpa: 1016,
        visibilityKm: 10,
        cloudCover: 15,
        uvIndex: 4.5,
        isDay: true,
        icon: 'clear-day',
        condition: 'Sunny',
        description: 'Clear sky',
      },
      {
        timestamp: sunrise + 5 * 3600,
        tempC: 23,
        feelsLikeC: 22,
        precipProbability: 10,
        windKmh: 15,
        windDeg: 220,
        humidity: 48,
        pressureHpa: 1014,
        visibilityKm: 12,
        cloudCover: 20,
        uvIndex: 5.2,
        isDay: true,
        icon: 'partly-cloudy',
        condition: 'Partly Cloudy',
        description: 'Scattered clouds',
      },
    ],
    daily: [
      {
        timestamp: sunrise + 4 * 3600,
        dayLabel: 'Today',
        minC: 14,
        maxC: 23,
        precipProbability: 10,
        icon: 'clear-day',
        condition: 'Sunny',
        hourlyMini: [15, 18, 22, 23, 19],
      },
    ],
    timeOfDay: [],
    airQuality: {index: 1, band: 'Good', pm25: 5, pm10: 12},
    uv: {index: 4.5, level: 'Moderate', advice: 'Wear sunglasses'},
    ...overrides,
  };
}

describe('units domain helpers', () => {
  it('converts Celsius to Fahrenheit accurately', () => {
    expect(convertTemp(0, 'C')).toBe(0);
    expect(convertTemp(0, 'F')).toBe(32);
    expect(convertTemp(25, 'F')).toBe(77);
    expect(formatTemp(25, 'C', true)).toBe('25°C');
    expect(formatTemp(25, 'F', true)).toBe('77°F');
  });

  it('converts wind speed and visibility between metric and imperial', () => {
    expect(convertSpeed(100, 'C')).toBe(100);
    expect(convertSpeed(100, 'F')).toBe(62);
    expect(convertVisibility(10, 'F')).toBe(6.2);
  });

  it('maps degrees to compass bearings', () => {
    expect(degreesToCompass(0)).toBe('N');
    expect(degreesToCompass(90)).toBe('E');
    expect(degreesToCompass(225)).toBe('SW');
    expect(degreesToCompass(355)).toBe('N');
  });
});

describe('AQI and UV domain helpers', () => {
  it('maps AQI scale 1-5 to accessible bands', () => {
    expect(getAqiMeta(1).band).toBe('Good');
    expect(getAqiMeta(3).band).toBe('Moderate');
    expect(getAqiMeta(5).band).toBe('Very Poor');
    expect(mapEuAqiToScale(15)).toBe(1);
    expect(mapEuAqiToScale(55)).toBe(3);
    expect(mapEuAqiToScale(95)).toBe(5);
  });

  it('classifies UV index values across 0-11+ range', () => {
    expect(getUvMeta(1.5).level).toBe('Low');
    expect(getUvMeta(4.2).level).toBe('Moderate');
    expect(getUvMeta(7.1).level).toBe('High');
    expect(getUvMeta(9.5).level).toBe('Very High');
    expect(toUvData(12).level).toBe('Extreme');
  });
});

describe('timezone-offset time, celestial & atmosphere logic', () => {
  it('computes local time strictly from API timezone offset', () => {
    const noonUtc = 1767268800;
    expect(formatCityTime(noonUtc, 0)).toBe('12:00 PM');
    expect(formatCityTime(noonUtc, 9 * 3600)).toBe('9:00 PM');
    expect(getGreetingForOffset(noonUtc, -5 * 3600)).toBe('Good morning');
    expect(getGreetingForOffset(noonUtc, 9 * 3600)).toBe('Quiet night');
  });

  it('computes sky phase and sun/moon arc progress', () => {
    const sunrise = 1_700_000_000;
    const sunset = sunrise + 12 * 3600;

    expect(computeSkyPhase(sunrise - 600, sunrise, sunset)).toBe('dawn');
    expect(computeSkyPhase(sunrise + 4 * 3600, sunrise, sunset)).toBe('day');
    expect(computeSkyPhase(sunset - 1800, sunrise, sunset)).toBe('golden-hour');
    expect(computeSkyPhase(sunset + 1200, sunrise, sunset)).toBe('dusk');
    expect(computeSkyPhase(sunset + 4 * 3600, sunrise, sunset)).toBe('night');

    const noonArc = getSunArcPosition(sunrise + 6 * 3600, sunrise, sunset);
    expect(noonArc.isDay).toBe(true);
    expect(noonArc.progress).toBeCloseTo(0.5, 2);

    expect(getGoldenHourCountdown(sunset - 1200, sunrise, sunset)).toContain('Golden hour');
    expect(getMoonPhase(sunrise).illumination).toBeGreaterThanOrEqual(0);
  });

  it('returns dark-sky accessible tokens during night phase', () => {
    const sunrise = 1_700_000_000;
    const sunset = sunrise + 12 * 3600;
    const bundle = makeMockBundle({
      observedAt: sunset + 3 * 3600,
      current: {
        ...makeMockBundle().current,
        icon: 'clear-night',
        isDay: false,
      },
    });

    const theme = getAtmosphere(bundle);
    expect(theme.phase).toBe('night');
    expect(theme.isDarkSky).toBe(true);
    expect(theme.effect).toBe('stars');
  });
});

describe('v2 time-travel scrubber & activities helpers', () => {
  it('derives scrubbed forecast slice and storm override cleanly', () => {
    const bundle = makeMockBundle();
    const scrubbed = deriveViewedWeather(bundle, 1);
    expect(scrubbed?.current.tempC).toBe(23);
    expect(scrubbed?.current.condition).toBe('Partly Cloudy');
    expect(scrubbed?.current.pressureTrend).toBe('falling');

    const storm = deriveViewedWeather(bundle, 0, {stormActive: true});
    expect(storm?.current.icon).toBe('thunder');
  });

  it('computes feels-like factors, wear advice, activity scores, and weekend celebration', () => {
    const bundle = makeMockBundle();
    const factors = computeFeelsLikeFactors({
      tempC: 24,
      feelsLikeC: 25,
      humidity: 72,
      windKmh: 12,
      cloudCover: 10,
      isDay: true,
    });
    expect(factors.length).toBeGreaterThanOrEqual(2);

    expect(getFriendlyMicrocopy(bundle)).toBe('Sunglasses weather');
    expect(computeWearAdvice(bundle).length).toBeGreaterThanOrEqual(2);

    const scores = computeActivityScores(bundle);
    expect(scores).toHaveLength(5);
    expect(scores.every((s) => s.score >= 5 && s.score <= 100)).toBe(true);

    // Saturday Nov 28, 2026 UTC noon = 1795867200
    const satBundle = makeMockBundle({
      daily: [
        {
          timestamp: 1795867200,
          dayLabel: 'Sat',
          minC: 15,
          maxC: 22,
          precipProbability: 5,
          icon: 'clear-day',
          condition: 'Sunny',
          hourlyMini: [16, 20, 22],
        },
      ],
    });
    expect(isWeekendClearAndMild(satBundle)).toBe(true);
  });
});

describe('geocoding search errors & normalization', () => {
  it('maps search failure reasons to actionable user messages', async () => {
    const {getSearchErrorMessage} = await import('../../services/weatherService');
    expect(getSearchErrorMessage('auth')).toContain("isn't active yet");
    expect(getSearchErrorMessage('rate_limit')).toContain('Too many searches');
    expect(getSearchErrorMessage('network')).toContain('offline');
  });

  it('normalizes Open-Meteo geocoding results and handles empty arrays cleanly', async () => {
    const {searchOpenMeteoCities} = await import('../../services/providers/openmeteo');
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              id: 1,
              name: 'Kharghar',
              admin1: 'Maharashtra',
              country_code: 'IN',
              latitude: 19.047,
              longitude: 73.069,
            },
          ],
        }),
        {status: 200}
      )) as typeof fetch;

    try {
      const okRes = await searchOpenMeteoCities('kharghar');
      expect(okRes.ok).toBe(true);
      if (okRes.ok) {
        expect(okRes.places).toHaveLength(1);
        expect(okRes.places[0]).toMatchObject({
          name: 'Kharghar',
          region: 'Maharashtra',
          country: 'IN',
        });
      }

      globalThis.fetch = (async () =>
        new Response(JSON.stringify({}), {status: 200})) as typeof fetch;
      const emptyRes = await searchOpenMeteoCities('zzzzzz');
      expect(emptyRes).toEqual({ok: true, places: []});
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

