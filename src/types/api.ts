export interface OpenWeatherCoord {
  lon: number;
  lat: number;
}

export interface OpenWeatherConditionRaw {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface OpenWeatherCurrentResponse {
  coord: OpenWeatherCoord;
  weather: OpenWeatherConditionRaw[];
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
}

export interface OpenWeatherForecastItem {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: OpenWeatherConditionRaw[];
  clouds: {
    all: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  visibility?: number;
  pop: number;
  dt_txt: string;
}

export interface OpenWeatherForecastResponse {
  list: OpenWeatherForecastItem[];
  city: {
    id: number;
    name: string;
    coord: OpenWeatherCoord;
    country: string;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

export interface OpenWeatherAirPollutionResponse {
  list: Array<{
    dt: number;
    main: {
      aqi: 1 | 2 | 3 | 4 | 5;
    };
    components: {
      co: number;
      no: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      nh3: number;
    };
  }>;
}

export interface OpenWeatherOneCallResponse {
  current?: {
    uvi?: number;
    dew_point?: number;
  };
  daily?: Array<{
    dt: number;
    sunrise?: number;
    sunset?: number;
    temp: {
      min: number;
      max: number;
      morn: number;
      day: number;
      eve: number;
      night: number;
    };
    weather: OpenWeatherConditionRaw[];
    pop: number;
    uvi: number;
  }>;
}

export interface OpenWeatherGeoDirectItem {
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    weather_code: number;
    cloud_cover: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m?: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature?: number[];
    relative_humidity_2m?: number[];
    precipitation_probability: number[];
    weather_code: number[];
    visibility: number[];
    wind_speed_10m: number[];
    wind_direction_10m?: number[];
    wind_gusts_10m?: number[];
    surface_pressure: number[];
    cloud_cover?: number[];
    uv_index?: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_probability_max: number[];
  };
}

export interface OpenMeteoAirQualityResponse {
  current?: {
    european_aqi?: number;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
    nitrogen_dioxide?: number;
    carbon_monoxide?: number;
  };
}

export interface OpenMeteoGeoResponse {
  results?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country_code?: string;
    country?: string;
    admin1?: string;
  }>;
}

export interface BigDataCloudReverseGeoResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryCode?: string;
  countryName?: string;
}
