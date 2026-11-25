export type TemperatureUnit = 'C' | 'F';

export type WeatherConditionKind =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'thunder'
  | 'snow'
  | 'mist';

export type SkyPhase = 'night' | 'dawn' | 'day' | 'golden-hour' | 'dusk';

export type PressureTrend = 'rising' | 'falling' | 'steady';

export type AqiBand = 'Good' | 'Fair' | 'Moderate' | 'Poor' | 'Very Poor';

export type UvLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';

export type TimeOfDayPeriod = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface CityLocation {
  id: string;
  name: string;
  region?: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

export interface GeocodedPlace {
  id: string;
  name: string;
  region?: string;
  country: string;
  lat: number;
  lon: number;
}

export type SearchFailureReason = 'auth' | 'rate_limit' | 'network' | 'unknown';

export type SearchCitiesResult =
  | {ok: true; places: GeocodedPlace[]}
  | {ok: false; reason: SearchFailureReason};

export interface SavedCity extends CityLocation {
  lastTempC?: number;
  lastHighC?: number;
  lastLowC?: number;
  lastCondition?: string;
  lastIcon?: WeatherConditionKind;
}

export interface AirQualityData {
  index: 1 | 2 | 3 | 4 | 5;
  band: AqiBand;
  pm25: number;
  pm10: number;
  o3?: number;
  no2?: number;
  co?: number;
}

export interface UvData {
  index: number;
  level: UvLevel;
  advice: string;
}

export interface HourlyPoint {
  timestamp: number; // unix seconds
  tempC: number;
  feelsLikeC: number;
  precipProbability: number; // 0..100
  windKmh: number;
  windDeg: number;
  windGustKmh?: number;
  humidity: number;
  pressureHpa: number;
  visibilityKm: number;
  cloudCover: number;
  uvIndex: number;
  isDay: boolean;
  icon: WeatherConditionKind;
  condition: string;
  description: string;
}

export interface DailyForecast {
  timestamp: number; // unix seconds
  dayLabel: string;
  minC: number;
  maxC: number;
  precipProbability: number; // 0..100
  icon: WeatherConditionKind;
  condition: string;
  sunrise?: number;
  sunset?: number;
  hourlyMini: number[]; // temps for hover sparkline
  periods?: Array<{period: TimeOfDayPeriod; tempC: number; icon: WeatherConditionKind}>;
}

export interface TimeOfDaySlot {
  period: TimeOfDayPeriod;
  tempC: number;
  windKmh: number;
  precipProbability: number;
  icon: WeatherConditionKind;
}

export interface CurrentWeather {
  tempC: number;
  feelsLikeC: number;
  minC: number;
  maxC: number;
  humidity: number; // %
  pressureHpa: number;
  pressureTrend: PressureTrend;
  windKmh: number;
  windDeg: number;
  windGustKmh?: number;
  visibilityKm: number;
  cloudCover: number; // %
  dewPointC?: number;
  condition: string;
  description: string;
  icon: WeatherConditionKind;
  isDay: boolean;
}

export interface WeatherBundle {
  provider: 'openweather' | 'open-meteo' | 'cached';
  location: CityLocation;
  timezoneOffsetSec: number;
  observedAt: number; // unix seconds
  sunrise: number; // unix seconds
  sunset: number; // unix seconds
  fetchedAtMs: number;
  current: CurrentWeather;
  hourly: HourlyPoint[]; // up to 24 hourly points
  daily: DailyForecast[];
  timeOfDay: TimeOfDaySlot[];
  airQuality: AirQualityData | null;
  uv: UvData | null;
  isStale?: boolean;
}

export type WeatherError =
  | { type: 'network'; message: string }
  | { type: 'rate_limit'; message: string }
  | { type: 'not_found'; message: string }
  | { type: 'partial'; message: string };

export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error';

export type AtmosphereEffect = 'none' | 'stars' | 'clouds' | 'rain' | 'snow' | 'mist' | 'thunder';

export interface AtmosphereTheme {
  phase: SkyPhase;
  isDarkSky: boolean;
  skyFrom: string;
  skyVia: string;
  skyTo: string;
  overlayOpacity: number;
  effect: AtmosphereEffect;
  glassBg: string;
  glassBorder: string;
  glassText: string;
  glassMuted: string;
  surfaceBg: string;
  surfaceBorder: string;
  surfaceText: string;
  surfaceMuted: string;
}

export interface CityLiveSnapshot {
  cityId: string;
  tempC: number;
  highC: number;
  lowC: number;
  condition: string;
  icon: WeatherConditionKind;
  timezoneOffsetSec: number;
  sparkline: number[];
  aqiIndex?: 1 | 2 | 3 | 4 | 5;
  precipProbability?: number;
  windKmh?: number;
  loading: boolean;
}
