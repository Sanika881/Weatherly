# Weatherly

**A calm, ad-free weather dashboard with a living sky backdrop.**

Weatherly pairs frosted-glass cards with atmospheric metrics, a 7-day outlook, and a background that shifts with local daylight and cloud cover. No ads, no popups, no tracking.

**Live demo:** https://weatherly-two-psi.vercel.app/

<!-- Add a screenshot: ![Weatherly dashboard](./docs/screenshot.png) -->

## Features

- **Current conditions:** temperature, feels-like, high/low, and a friendly weather illustration
- **7-day forecast:** glass card with a temperature range bar per day and a marker for the current temperature
- **Next 24 hours:** hourly temperature, condition, and precipitation probability
- **Time of day:** morning, afternoon, evening, and night temperatures at a glance
- **Atmospheric metrics:** air quality index, pressure with trend, UV index, humidity, wind, and visibility
- **Tomorrow card:** a tinted summary that matches the forecast condition
- **City search and saved cities:** find any city or region, pin favorites, and jump between them
- **My location:** one-tap geolocation, with a fallback city if permission is denied
- **Units and refresh:** °C/°F toggle and manual refresh
- **Living sky:** the backdrop adapts to dawn, day, golden hour, dusk, and night, plus cloud cover and conditions

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React, TypeScript |
| Styling | Tailwind CSS |
| Data | [OpenWeather API](https://openweathermap.org/api) |
| Tooling | Vite |
| Hosting | Vercel |

## Getting started

### Prerequisites

- Node.js 18 or newer
- An OpenWeather API key

### Install and run

```bash
git clone <your-repo-url>
cd weatherly
npm install
cp .env.example .env
# add your key to .env, then:
npm run dev
```

### Environment variables

| Variable | Description |
| --- | --- |
| `VITE_OPENWEATHER_API_KEY` | Your OpenWeather API key |

Vite reads environment variables only at startup, so restart the dev server after changing `.env`. On Vercel, add the variable under **Project Settings → Environment Variables** and redeploy.

### Getting an API key

1. Sign up at [openweathermap.org](https://openweathermap.org/).
2. Copy your key from the **API keys** tab of your account.
3. New keys can take up to a couple of hours to activate. Until then you may see "invalid API key" errors.

**API plans:** current weather, the 5-day forecast, air pollution, and geocoding work on the free plan. UV index and the hourly and 8-day forecasts come from One Call API 3.0, a separate "One Call by Call" subscription with 1,000 free calls per day that requires card details. If you subscribe, set a daily call limit on the **Billing plans** tab to avoid unexpected charges.

> **Note:** variables prefixed with `VITE_` are bundled into the frontend and are visible to anyone who inspects the site. Restrict your key's usage, or route requests through a small server-side proxy if you publish this publicly.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |

## Architecture

Dependencies flow one way: UI → hooks → domain services → external systems.

- **Presentation:** React components that only render typed data and never touch `fetch` or raw API responses
- **State and hooks:** `useWeather`, `useGeolocation`, and `useLocalStorage` hold all side effects
- **Domain and services:** a `weatherService` adapter with a 10-minute in-memory cache, plus pure helpers for AQI banding, UV, unit conversion, and the sky/atmosphere logic
- **External:** the OpenWeather API and browser APIs (geolocation, storage)

Because the UI only talks to the service layer, the data provider can be swapped (for example to Open-Meteo) by changing one file.

```
src/
  components/   UI cards and layout
  icons/        animated SVG weather icons
  hooks/        useWeather, useGeolocation, useLocalStorage, useDebounce
  services/     weatherService, cache, mappers
  domain/       atmosphere, aqi, uv, units, time
  types/        raw API types and domain models
```

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| "Could not search cities right now" | Key not active yet, key missing from the build, or a failed geocoding request. Check the browser's Network tab for the status code. |
| Data missing after adding the key | Restart the dev server, or redeploy on Vercel, so the variable is picked up. |
| UV or hourly data missing | One Call API 3.0 subscription is not active on your key. |
| Location shows a placeholder name | Reverse geocoding failed or geolocation was denied. |

To test the key directly, open this in a browser (with your key):

```
https://api.openweathermap.org/geo/1.0/direct?q=Mumbai&limit=5&appid=YOUR_KEY
```

A JSON list means the key works. A `401` means it is wrong or not yet active.

## Accessibility and performance

- Semantic HTML, labelled icon buttons, keyboard-navigable search, and visible focus rings
- Respects `prefers-reduced-motion`
- Lightweight: no charting library; ranges, gauges, and sparklines are plain SVG and CSS

## Roadmap

- Time-travel scrubber that updates the whole dashboard for any hour
- Weather-reactive sky particles (rain, snow, stars)
- Expandable metric tiles with detail views
- City comparison mode
- Activity scores and "what should I wear" suggestions

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you would like to change.

## Acknowledgements

- Weather data by [OpenWeather](https://openweathermap.org/)
- Layout inspiration from iOS-style forecast cards and modern weather dashboards

