import {formatTemp} from '../domain/units';
import type {TemperatureUnit, WeatherBundle} from '../types/weather';

export async function shareWeatherCardPng(
  weather: WeatherBundle,
  unit: TemperatureUnit
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Sky gradient background
  const grad = ctx.createLinearGradient(0, 0, 960, 540);
  if (weather.current.isDay) {
    grad.addColorStop(0, '#4580B8');
    grad.addColorStop(0.55, '#8AB8D8');
    grad.addColorStop(1, '#EED6CA');
  } else {
    grad.addColorStop(0, '#09142C');
    grad.addColorStop(0.55, '#13244A');
    grad.addColorStop(1, '#1D335D');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 960, 540);

  // Soft card panel
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.beginPath();
  ctx.roundRect(56, 56, 848, 428, 32);
  ctx.fill();

  // Text
  ctx.fillStyle = '#F97316';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('WEATHERLY', 100, 118);

  ctx.fillStyle = '#0F1B3D';
  ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
  const title = weather.location.country
    ? `${weather.location.name}, ${weather.location.country}`
    : weather.location.name;
  ctx.fillText(title, 100, 178);

  ctx.font = '700 118px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(formatTemp(weather.current.tempC, unit, true), 100, 324);

  ctx.fillStyle = '#475569';
  ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${weather.current.description}  ·  Feels like ${formatTemp(weather.current.feelsLikeC, unit)}`,
    100,
    382
  );

  ctx.fillStyle = '#0F1B3D';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `High ${formatTemp(weather.current.maxC, unit)}   ·   Low ${formatTemp(weather.current.minC, unit)}   ·   Humidity ${weather.current.humidity}%   ·   Pressure ${weather.current.pressureHpa} hPa`,
    100,
    438
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) return;

  const file = new File([blob], `weatherly-${weather.location.name.toLowerCase()}.png`, {
    type: 'image/png',
  });

  if (navigator.canShare && navigator.canShare({files: [file]})) {
    try {
      await navigator.share({files: [file], title: `${title} Weather`});
      return;
    } catch {
      // Fallback to download
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `weatherly-${weather.location.name.toLowerCase()}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
