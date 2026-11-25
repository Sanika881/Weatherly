# Weatherly

A clean, calm weather interface built around frosted glass cards, a living CSS sky backdrop, and tabular atmospheric metrics.

## Features
- **Living Sky Atmosphere**: Pure CSS gradients (`night`, `dawn`, `day`, `golden-hour`, `dusk`) computed from the viewed city's sunrise, sunset, and timezone offset—transitioning smoothly over 1.5s with `prefers-reduced-motion` support.
- **7-Day Frosted Glass Forecast**: iOS-inspired range bars mapping daily temperatures across a thermal spectrum with a current-temperature marker on Today.
- **Atmospheric Telemetry**: Barometric pressure with rising/falling trend arrow, dark navy Air Quality Index (AQI) contrast tile, custom SVG UV arc gauge, humidity, wind compass, and visibility.
- **24-Hour Scrollable Strip & Time-of-Day Breakdown**: Hourly temperature sparkline, precipitation probability bars, and Morning/Afternoon/Evening/Night toggles (`Temp`, `Wind`, `Rain`).
- **Smart Persistence & Caching**: 10-minute in-memory TTL cache with in-flight request deduplication, schema-versioned `localStorage` for saved cities and `°C`/`°F` unit preferences, and offline fallback.

## Setup & API Key
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your OpenWeather API key to `.env`:
   ```bash
   VITE_OPENWEATHER_API_KEY="your_openweather_api_key"
   ```
   When `VITE_OPENWEATHER_API_KEY` is set, Weatherly calls `/data/2.5/weather`, `/data/2.5/forecast`, `/data/2.5/air_pollution`, `/data/3.0/onecall` (for UV index), and `/geo/1.0/direct` behind `src/services/weatherService.ts`.
   When omitted, Weatherly automatically uses Open-Meteo as a zero-key live fallback so the dashboard works out of the box.

## Scripts
- `npm run dev` — Start the Vite development server on port 3000.
- `npm run build` — Build production static assets.
- `npm run lint` — Run TypeScript strict type-checking (`tsc --noEmit`).
- `npm run test` — Run Vitest unit tests for domain logic (`units`, `aqi`, `uv`, `time`, `atmosphere`).
- `npm run vite-bundle-visualizer` — Generate `dist/stats.html` gzip/brotli bundle treemap.
- `npm run size-check` — Verify application code stays under the **35 KB gzipped** budget.

## Architecture & Bundle Size
Weatherly enforces strict one-way dependencies:
`UI (src/components)` → `Hooks (src/hooks)` → `Services (src/services)` → `Pure Domain (src/domain)` & `External APIs`.

To keep application code well under **35 KB gzipped**, all gauges, range bars, sparklines, and animated weather icons are drawn with lightweight inline SVG/CSS without any charting or animation libraries, `SettingsModal` is lazy-loaded, and `lucide-react` icons use per-icon imports.
