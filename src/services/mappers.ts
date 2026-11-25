import {getAqiMeta, mapEuAqiToScale} from '../domain/aqi';
import {getCityDayKey, getCityHour, getDayLabel} from '../domain/time';
import {toUvData} from '../domain/uv';
import type {
  OpenMeteoAirQualityResponse,
  OpenMeteoForecastResponse,
  OpenWeatherAirPollutionResponse,
  OpenWeatherCurrentResponse,
  OpenWeatherForecastItem,
  OpenWeatherForecastResponse,
  OpenWeatherOneCallResponse,
} from '../types/api';
import type {
  AirQualityData,
  CityLocation,
  DailyForecast,
  HourlyPoint,
  PressureTrend,
  TimeOfDayPeriod,
  TimeOfDaySlot,
  WeatherBundle,
  WeatherConditionKind,
} from '../types/weather';

function capitalizeWords(input: string): string {
  return input
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function mapOwmCodeToIcon(code: number, isDay: boolean): WeatherConditionKind {
  if (code >= 200 && code < 300) return 'thunder';
  if (code >= 300 && code < 600) return 'rain';
  if (code >= 600 && code < 700) return 'snow';
  if (code >= 700 && code < 800) return 'mist';
  if (code === 800) return isDay ? 'clear-day' : 'clear-night';
  if (code === 801 || code === 802) return isDay ? 'partly-cloudy' : 'cloudy';
  return 'cloudy';
}

export function mapWmoCodeToCondition(
  code: number,
  isDay: boolean
): {icon: WeatherConditionKind; condition: string; description: string} {
  if (code === 0) {
    return {
      icon: isDay ? 'clear-day' : 'clear-night',
      condition: isDay ? 'Sunny' : 'Clear',
      description: isDay ? 'Clear sky' : 'Clear night sky',
    };
  }
  if (code === 1 || code === 2) {
    return {
      icon: isDay ? 'partly-cloudy' : 'cloudy',
      condition: 'Partly Cloudy',
      description: 'Scattered clouds',
    };
  }
  if (code === 3) {
    return {
      icon: 'cloudy',
      condition: 'Cloudy',
      description: 'Overcast sky',
    };
  }
  if (code === 45 || code === 48) {
    return {
      icon: 'mist',
      condition: 'Mist',
      description: 'Fog and light mist',
    };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      icon: 'rain',
      condition: 'Rainy',
      description: code >= 63 ? 'Moderate rain' : 'Light rain showers',
    };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return {
      icon: 'snow',
      condition: 'Snow',
      description: 'Light snowfall',
    };
  }
  if (code >= 95) {
    return {
      icon: 'thunder',
      condition: 'Thunderstorm',
      description: 'Thunderstorms expected',
    };
  }
  return {
    icon: isDay ? 'partly-cloudy' : 'cloudy',
    condition: 'Cloudy',
    description: 'Variable clouds',
  };
}

function computePressureTrend(currentHpa: number, nextHpa?: number): PressureTrend {
  if (nextHpa === undefined) return 'steady';
  const delta = nextHpa - currentHpa;
  if (delta >= 1.5) return 'rising';
  if (delta <= -1.5) return 'falling';
  return 'steady';
}

function buildTimeOfDayFromHourly(
  hourly: HourlyPoint[],
  timezoneOffsetSec: number,
  fallback: {tempC: number; windKmh: number; icon: WeatherConditionKind}
): TimeOfDaySlot[] {
  const periods: Array<{period: TimeOfDayPeriod; targetHour: number}> = [
    {period: 'Morning', targetHour: 9},
    {period: 'Afternoon', targetHour: 14},
    {period: 'Evening', targetHour: 19},
    {period: 'Night', targetHour: 23},
  ];

  const first24 = hourly.slice(0, 24);
  return periods.map(({period, targetHour}) => {
    if (first24.length === 0) {
      return {
        period,
        tempC: fallback.tempC,
        windKmh: fallback.windKmh,
        precipProbability: 0,
        icon: fallback.icon,
      };
    }

    let best = first24[0];
    let bestDiff = 24;
    for (const point of first24) {
      const hour = getCityHour(point.timestamp, timezoneOffsetSec);
      const diff = Math.abs(hour - targetHour);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = point;
      }
    }

    return {
      period,
      tempC: best.tempC,
      windKmh: best.windKmh,
      precipProbability: best.precipProbability,
      icon: best.icon,
    };
  });
}

function buildDailyPeriods(
  minC: number,
  maxC: number,
  icon: WeatherConditionKind
): Array<{period: TimeOfDayPeriod; tempC: number; icon: WeatherConditionKind}> {
  const span = maxC - minC;
  return [
    {period: 'Morning', tempC: Math.round((minC + span * 0.32) * 10) / 10, icon},
    {period: 'Afternoon', tempC: Math.round(maxC * 10) / 10, icon},
    {period: 'Evening', tempC: Math.round((minC + span * 0.55) * 10) / 10, icon},
    {period: 'Night', tempC: Math.round(minC * 10) / 10, icon: icon === 'clear-day' ? 'clear-night' : icon},
  ];
}

function buildMiniCurve(minC: number, maxC: number): number[] {
  const weights = [0.15, 0.05, 0.32, 0.72, 1.0, 0.85, 0.52, 0.24];
  return weights.map((w) => Math.round((minC + (maxC - minC) * w) * 10) / 10);
}

function interpolateOwmHourly(
  items: OpenWeatherForecastItem[],
  current: OpenWeatherCurrentResponse,
  sunrise: number,
  sunset: number,
  currentUvi: number
): HourlyPoint[] {
  const anchorCond = current.weather[0];
  const anchorIsDay = current.dt >= sunrise && current.dt < sunset;
  const basePoints: HourlyPoint[] = [
    {
      timestamp: current.dt,
      tempC: current.main.temp,
      feelsLikeC: current.main.feels_like,
      precipProbability: Math.round((items[0]?.pop ?? 0) * 100),
      windKmh: Math.round(current.wind.speed * 3.6),
      windDeg: current.wind.deg,
      windGustKmh: current.wind.gust ? Math.round(current.wind.gust * 3.6) : undefined,
      humidity: current.main.humidity,
      pressureHpa: Math.round(current.main.pressure),
      visibilityKm: Math.round((current.visibility / 1000) * 10) / 10,
      cloudCover: current.clouds.all,
      uvIndex: anchorIsDay ? currentUvi : 0,
      isDay: anchorIsDay,
      icon: mapOwmCodeToIcon(anchorCond?.id ?? 800, anchorIsDay),
      condition: capitalizeWords(anchorCond?.main ?? 'Clear'),
      description: capitalizeWords(anchorCond?.description ?? 'Clear sky'),
    },
  ];

  for (const item of items.slice(0, 8)) {
    const itemHour = ((item.dt % 86400) + 86400) % 86400;
    const srHour = ((sunrise % 86400) + 86400) % 86400;
    const ssHour = ((sunset % 86400) + 86400) % 86400;
    const itemIsDay = itemHour >= srHour && itemHour < ssHour;
    const w = item.weather[0];
    basePoints.push({
      timestamp: item.dt,
      tempC: item.main.temp,
      feelsLikeC: item.main.feels_like,
      precipProbability: Math.round((item.pop ?? 0) * 100),
      windKmh: Math.round(item.wind.speed * 3.6),
      windDeg: item.wind.deg,
      windGustKmh: item.wind.gust ? Math.round(item.wind.gust * 3.6) : undefined,
      humidity: item.main.humidity,
      pressureHpa: Math.round(item.main.pressure),
      visibilityKm: Math.round(((item.visibility ?? 10000) / 1000) * 10) / 10,
      cloudCover: item.clouds.all,
      uvIndex: itemIsDay ? Math.max(0, Math.round(currentUvi * (1 - item.clouds.all / 150) * 10) / 10) : 0,
      isDay: itemIsDay,
      icon: mapOwmCodeToIcon(w?.id ?? 800, itemIsDay),
      condition: capitalizeWords(w?.main ?? 'Clear'),
      description: capitalizeWords(w?.description ?? 'Clear sky'),
    });
  }

  // Produce 24 1-hour steps by interpolating between consecutive 3-hour blocks
  const result: HourlyPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const targetTs = current.dt + h * 3600;
    let left = basePoints[0];
    let right = basePoints[basePoints.length - 1];
    for (let i = 0; i < basePoints.length - 1; i++) {
      if (targetTs >= basePoints[i].timestamp && targetTs <= basePoints[i + 1].timestamp) {
        left = basePoints[i];
        right = basePoints[i + 1];
        break;
      }
    }
    const span = Math.max(1, right.timestamp - left.timestamp);
    const t = Math.max(0, Math.min(1, (targetTs - left.timestamp) / span));
    const lerp = (a: number, b: number) => a + (b - a) * t;
    const ref = t < 0.5 ? left : right;

    const localDayOffset = ((targetTs - current.dt) % 86400);
    const checkTs = current.dt + localDayOffset;
    const stepIsDay =
      checkTs >= sunrise && checkTs < sunset
        ? true
        : checkTs >= sunrise + 86400 && checkTs < sunset + 86400;

    result.push({
      timestamp: targetTs,
      tempC: Math.round(lerp(left.tempC, right.tempC) * 10) / 10,
      feelsLikeC: Math.round(lerp(left.feelsLikeC, right.feelsLikeC) * 10) / 10,
      precipProbability: Math.round(lerp(left.precipProbability, right.precipProbability)),
      windKmh: Math.round(lerp(left.windKmh, right.windKmh)),
      windDeg: ref.windDeg,
      windGustKmh: ref.windGustKmh,
      humidity: Math.round(lerp(left.humidity, right.humidity)),
      pressureHpa: Math.round(lerp(left.pressureHpa, right.pressureHpa)),
      visibilityKm: Math.round(lerp(left.visibilityKm, right.visibilityKm) * 10) / 10,
      cloudCover: Math.round(lerp(left.cloudCover, right.cloudCover)),
      uvIndex: stepIsDay ? Math.round(lerp(left.uvIndex, right.uvIndex) * 10) / 10 : 0,
      isDay: stepIsDay,
      icon: ref.icon === 'clear-day' && !stepIsDay ? 'clear-night' : ref.icon === 'clear-night' && stepIsDay ? 'clear-day' : ref.icon,
      condition: ref.condition,
      description: ref.description,
    });
  }

  return result;
}

function aggregateDailyFrom3hForecast(
  items: OpenWeatherForecastItem[],
  timezoneOffsetSec: number,
  currentTempC: number,
  currentMinC: number,
  currentMaxC: number,
  currentIcon: WeatherConditionKind,
  currentCondition: string,
  sunrise: number,
  sunset: number
): DailyForecast[] {
  const buckets = new Map<string, OpenWeatherForecastItem[]>();
  for (const item of items) {
    const key = getCityDayKey(item.dt, timezoneOffsetSec);
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  const days: DailyForecast[] = [];
  let idx = 0;
  for (const [, group] of buckets.entries()) {
    if (idx >= 7) break;
    const minVal = idx === 0 ? Math.min(...group.map((g) => g.main.temp_min), currentMinC, currentTempC) : Math.min(...group.map((g) => g.main.temp_min));
    const maxVal = idx === 0 ? Math.max(...group.map((g) => g.main.temp_max), currentMaxC, currentTempC) : Math.max(...group.map((g) => g.main.temp_max));
    const maxPop = Math.round(Math.max(...group.map((g) => g.pop)) * 100);
    const midItem = group[Math.floor(group.length / 2)] ?? group[0];
    const cond = midItem.weather[0];
    const icon = idx === 0 ? currentIcon : mapOwmCodeToIcon(cond?.id ?? 800, true);

    days.push({
      timestamp: midItem.dt,
      dayLabel: getDayLabel(midItem.dt, timezoneOffsetSec, idx),
      minC: minVal,
      maxC: maxVal,
      precipProbability: maxPop,
      icon,
      condition: idx === 0 ? currentCondition : capitalizeWords(cond?.main ?? 'Clear'),
      sunrise: sunrise + idx * 86400,
      sunset: sunset + idx * 86400,
      hourlyMini: group.length >= 4 ? group.map((g) => g.main.temp) : buildMiniCurve(minVal, maxVal),
      periods: buildDailyPeriods(minVal, maxVal, icon),
    });
    idx++;
  }

  while (days.length > 0 && days.length < 7) {
    const last = days[days.length - 1];
    const prev = days[days.length - 2] ?? last;
    const nextTs = last.timestamp + 86400;
    const drift = (last.maxC - prev.maxC) * 0.35;
    const minC = Math.round((last.minC + drift * 0.5) * 10) / 10;
    const maxC = Math.round((last.maxC + drift) * 10) / 10;
    days.push({
      timestamp: nextTs,
      dayLabel: getDayLabel(nextTs, timezoneOffsetSec, days.length),
      minC,
      maxC,
      precipProbability: last.precipProbability,
      icon: last.icon,
      condition: last.condition,
      sunrise: (last.sunrise ?? sunrise) + 86400,
      sunset: (last.sunset ?? sunset) + 86400,
      hourlyMini: buildMiniCurve(minC, maxC),
      periods: buildDailyPeriods(minC, maxC, last.icon),
    });
  }

  return days;
}

export function mapOpenWeatherToBundle(params: {
  locationOverride?: Partial<CityLocation>;
  current: OpenWeatherCurrentResponse;
  forecast: OpenWeatherForecastResponse | null;
  airPollution: OpenWeatherAirPollutionResponse | null;
  oneCall: OpenWeatherOneCallResponse | null;
}): WeatherBundle {
  const {current, forecast, airPollution, oneCall, locationOverride} = params;
  const timezoneOffsetSec = current.timezone;
  const isDay = current.dt >= current.sys.sunrise && current.dt < current.sys.sunset;
  const primaryCond = current.weather[0];
  const icon = mapOwmCodeToIcon(primaryCond?.id ?? 800, isDay);
  const uviValue = oneCall?.current?.uvi;

  const hourly = interpolateOwmHourly(
    forecast?.list ?? [],
    current,
    current.sys.sunrise,
    current.sys.sunset,
    typeof uviValue === 'number' ? uviValue : isDay ? 3.5 : 0
  );

  const daily: DailyForecast[] =
    oneCall?.daily && oneCall.daily.length >= 7
      ? oneCall.daily.slice(0, 7).map((d, index) => {
          const w = d.weather[0];
          const dIcon = mapOwmCodeToIcon(w?.id ?? 800, true);
          return {
            timestamp: d.dt,
            dayLabel: getDayLabel(d.dt, timezoneOffsetSec, index),
            minC: d.temp.min,
            maxC: d.temp.max,
            precipProbability: Math.round((d.pop ?? 0) * 100),
            icon: dIcon,
            condition: capitalizeWords(w?.main ?? 'Clear'),
            sunrise: d.sunrise ?? current.sys.sunrise + index * 86400,
            sunset: d.sunset ?? current.sys.sunset + index * 86400,
            hourlyMini: buildMiniCurve(d.temp.min, d.temp.max),
            periods: [
              {period: 'Morning', tempC: d.temp.morn, icon: dIcon},
              {period: 'Afternoon', tempC: d.temp.day, icon: dIcon},
              {period: 'Evening', tempC: d.temp.eve, icon: dIcon},
              {period: 'Night', tempC: d.temp.night, icon: dIcon === 'clear-day' ? 'clear-night' : dIcon},
            ],
          };
        })
      : aggregateDailyFrom3hForecast(
          forecast?.list ?? [],
          timezoneOffsetSec,
          current.main.temp,
          current.main.temp_min,
          current.main.temp_max,
          icon,
          capitalizeWords(primaryCond?.main ?? 'Clear'),
          current.sys.sunrise,
          current.sys.sunset
        );

  const today = daily[0];
  const aqiRaw = airPollution?.list?.[0];
  const airQuality: AirQualityData | null = aqiRaw
    ? {
        index: aqiRaw.main.aqi,
        band: getAqiMeta(aqiRaw.main.aqi).band,
        pm25: Math.round(aqiRaw.components.pm2_5 * 10) / 10,
        pm10: Math.round(aqiRaw.components.pm10 * 10) / 10,
        o3: Math.round(aqiRaw.components.o3),
        no2: Math.round(aqiRaw.components.no2),
        co: Math.round(aqiRaw.components.co),
      }
    : null;

  const uv = typeof uviValue === 'number' ? toUvData(uviValue) : null;
  const nextPressure = forecast?.list?.[1]?.main.pressure;

  const location: CityLocation = {
    id: `${current.coord.lat.toFixed(3)},${current.coord.lon.toFixed(3)}`,
    name:
      locationOverride?.name ||
      current.name ||
      forecast?.city.name ||
      `Nearby (${current.coord.lat.toFixed(2)}, ${current.coord.lon.toFixed(2)})`,
    region: locationOverride?.region || locationOverride?.state,
    country: locationOverride?.country || current.sys.country || '',
    state: locationOverride?.state,
    lat: current.coord.lat,
    lon: current.coord.lon,
  };

  return {
    provider: 'openweather',
    location,
    timezoneOffsetSec,
    observedAt: current.dt,
    sunrise: current.sys.sunrise,
    sunset: current.sys.sunset,
    fetchedAtMs: Date.now(),
    current: {
      tempC: current.main.temp,
      feelsLikeC: current.main.feels_like,
      minC: today ? today.minC : current.main.temp_min,
      maxC: today ? today.maxC : current.main.temp_max,
      humidity: current.main.humidity,
      pressureHpa: Math.round(current.main.pressure),
      pressureTrend: computePressureTrend(current.main.pressure, nextPressure),
      windKmh: Math.round(current.wind.speed * 3.6),
      windDeg: current.wind.deg,
      windGustKmh: current.wind.gust ? Math.round(current.wind.gust * 3.6) : undefined,
      visibilityKm: Math.round((current.visibility / 1000) * 10) / 10,
      cloudCover: current.clouds.all,
      dewPointC: oneCall?.current?.dew_point,
      condition: capitalizeWords(primaryCond?.main ?? 'Clear'),
      description: capitalizeWords(primaryCond?.description ?? 'Clear sky'),
      icon,
      isDay,
    },
    hourly,
    daily,
    timeOfDay: buildTimeOfDayFromHourly(hourly, timezoneOffsetSec, {
      tempC: current.main.temp,
      windKmh: Math.round(current.wind.speed * 3.6),
      icon,
    }),
    airQuality,
    uv,
  };
}

function parseIsoUtcWithOffset(iso: string, offsetSec: number): number {
  const [datePart, timePart = '00:00'] = iso.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  const utcMs = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  return Math.floor(utcMs / 1000) - offsetSec;
}

export function mapOpenMeteoToBundle(params: {
  location: CityLocation;
  forecast: OpenMeteoForecastResponse;
  airQuality: OpenMeteoAirQualityResponse | null;
}): WeatherBundle {
  const {location, forecast, airQuality} = params;
  const offsetSec = forecast.utc_offset_seconds;
  const observedAt = parseIsoUtcWithOffset(forecast.current.time, offsetSec);
  const isDay = forecast.current.is_day === 1;
  const currentCond = mapWmoCodeToCondition(forecast.current.weather_code, isDay);

  const sunrise = forecast.daily.sunrise[0]
    ? parseIsoUtcWithOffset(forecast.daily.sunrise[0], offsetSec)
    : observedAt - 6 * 3600;
  const sunset = forecast.daily.sunset[0]
    ? parseIsoUtcWithOffset(forecast.daily.sunset[0], offsetSec)
    : observedAt + 6 * 3600;

  const hourlyTimes = forecast.hourly.time.map((t) => parseIsoUtcWithOffset(t, offsetSec));
  let startIdx = hourlyTimes.findIndex((ts) => ts >= observedAt - 1800);
  if (startIdx < 0) startIdx = 0;

  // Build full 24 1-hour points for smooth time-travel scrubber & tile charts
  const hourly: HourlyPoint[] = [];
  for (let i = startIdx; i < Math.min(startIdx + 24, hourlyTimes.length); i++) {
    const hIsDay = forecast.hourly.is_day[i] === 1;
    const hCond = mapWmoCodeToCondition(forecast.hourly.weather_code[i] ?? 0, hIsDay);
    const visMeters = forecast.hourly.visibility[i] ?? 10000;
    hourly.push({
      timestamp: hourlyTimes[i],
      tempC: forecast.hourly.temperature_2m[i] ?? forecast.current.temperature_2m,
      feelsLikeC:
        forecast.hourly.apparent_temperature?.[i] ??
        forecast.hourly.temperature_2m[i] ??
        forecast.current.apparent_temperature,
      precipProbability: Math.round(forecast.hourly.precipitation_probability[i] ?? 0),
      windKmh: Math.round(forecast.hourly.wind_speed_10m[i] ?? forecast.current.wind_speed_10m),
      windDeg: Math.round(
        forecast.hourly.wind_direction_10m?.[i] ?? forecast.current.wind_direction_10m
      ),
      windGustKmh: forecast.hourly.wind_gusts_10m?.[i]
        ? Math.round(forecast.hourly.wind_gusts_10m[i])
        : undefined,
      humidity: Math.round(
        forecast.hourly.relative_humidity_2m?.[i] ?? forecast.current.relative_humidity_2m
      ),
      pressureHpa: Math.round(
        forecast.hourly.surface_pressure[i] ?? forecast.current.surface_pressure
      ),
      visibilityKm: Math.round((visMeters / 1000) * 10) / 10,
      cloudCover: Math.round(
        forecast.hourly.cloud_cover?.[i] ?? forecast.current.cloud_cover
      ),
      uvIndex: (() => {
        const raw = forecast.hourly.uv_index?.[i];
        const val = typeof raw === 'number' && Number.isFinite(raw) ? raw : hIsDay ? 2 : 0;
        return Math.round(val * 10) / 10;
      })(),
      isDay: hIsDay,
      icon: hCond.icon,
      condition: hCond.condition,
      description: hCond.description,
    });
  }

  const daily: DailyForecast[] = forecast.daily.time.slice(0, 7).map((dateStr, idx) => {
    const ts = parseIsoUtcWithOffset(`${dateStr}T12:00`, offsetSec);
    const dCond = mapWmoCodeToCondition(forecast.daily.weather_code[idx] ?? 0, true);
    const daySunrise = forecast.daily.sunrise[idx]
      ? parseIsoUtcWithOffset(forecast.daily.sunrise[idx], offsetSec)
      : sunrise + idx * 86400;
    const daySunset = forecast.daily.sunset[idx]
      ? parseIsoUtcWithOffset(forecast.daily.sunset[idx], offsetSec)
      : sunset + idx * 86400;
    const minC = forecast.daily.temperature_2m_min[idx] ?? forecast.current.temperature_2m - 4;
    const maxC = forecast.daily.temperature_2m_max[idx] ?? forecast.current.temperature_2m + 4;

    // Extract 8 hourly samples from forecast.hourly for this day's mini-curve
    const dayPrefix = dateStr;
    const dayTemps: number[] = [];
    for (let j = 0; j < forecast.hourly.time.length; j += 3) {
      if (forecast.hourly.time[j].startsWith(dayPrefix)) {
        dayTemps.push(forecast.hourly.temperature_2m[j]);
      }
    }

    return {
      timestamp: ts,
      dayLabel: getDayLabel(ts, offsetSec, idx),
      minC,
      maxC,
      precipProbability: Math.round(forecast.daily.precipitation_probability_max[idx] ?? 0),
      icon: dCond.icon,
      condition: dCond.condition,
      sunrise: daySunrise,
      sunset: daySunset,
      hourlyMini: dayTemps.length >= 4 ? dayTemps : buildMiniCurve(minC, maxC),
      periods: buildDailyPeriods(minC, maxC, dCond.icon),
    };
  });

  const nextPressure = forecast.hourly.surface_pressure[startIdx + 3];
  const currentVisMeters = forecast.hourly.visibility[startIdx] ?? 10000;

  const euAqi = airQuality?.current?.european_aqi;
  const aqiData: AirQualityData | null =
    typeof euAqi === 'number'
      ? (() => {
          const index = mapEuAqiToScale(euAqi);
          return {
            index,
            band: getAqiMeta(index).band,
            pm25: Math.round((airQuality?.current?.pm2_5 ?? 8.2) * 10) / 10,
            pm10: Math.round((airQuality?.current?.pm10 ?? 14.5) * 10) / 10,
            o3: airQuality?.current?.ozone ? Math.round(airQuality.current.ozone) : undefined,
            no2: airQuality?.current?.nitrogen_dioxide
              ? Math.round(airQuality.current.nitrogen_dioxide)
              : undefined,
            co: airQuality?.current?.carbon_monoxide
              ? Math.round(airQuality.current.carbon_monoxide)
              : undefined,
          };
        })()
      : null;

  const rawHourlyUv = forecast.hourly.uv_index?.[startIdx];
  const rawDailyUv = forecast.daily.uv_index_max?.[0];
  const currentUvRaw =
    typeof rawHourlyUv === 'number' && Number.isFinite(rawHourlyUv)
      ? rawHourlyUv
      : typeof rawDailyUv === 'number' && Number.isFinite(rawDailyUv)
      ? rawDailyUv
      : isDay
      ? 2
      : 0;
  const effectiveUv = isDay ? Math.round(currentUvRaw * 10) / 10 : 0;

  return {
    provider: 'open-meteo',
    location,
    timezoneOffsetSec: offsetSec,
    observedAt,
    sunrise,
    sunset,
    fetchedAtMs: Date.now(),
    current: {
      tempC: forecast.current.temperature_2m,
      feelsLikeC: forecast.current.apparent_temperature,
      minC: daily[0]?.minC ?? forecast.current.temperature_2m - 3,
      maxC: daily[0]?.maxC ?? forecast.current.temperature_2m + 4,
      humidity: Math.round(forecast.current.relative_humidity_2m),
      pressureHpa: Math.round(forecast.current.surface_pressure),
      pressureTrend: computePressureTrend(forecast.current.surface_pressure, nextPressure),
      windKmh: Math.round(forecast.current.wind_speed_10m),
      windDeg: Math.round(forecast.current.wind_direction_10m),
      windGustKmh: forecast.current.wind_gusts_10m
        ? Math.round(forecast.current.wind_gusts_10m)
        : undefined,
      visibilityKm: Math.round((currentVisMeters / 1000) * 10) / 10,
      cloudCover: Math.round(forecast.current.cloud_cover),
      condition: currentCond.condition,
      description: currentCond.description,
      icon: currentCond.icon,
      isDay,
    },
    hourly,
    daily,
    timeOfDay: buildTimeOfDayFromHourly(hourly, offsetSec, {
      tempC: forecast.current.temperature_2m,
      windKmh: Math.round(forecast.current.wind_speed_10m),
      icon: currentCond.icon,
    }),
    airQuality: aqiData,
    uv: toUvData(effectiveUv),
  };
}
