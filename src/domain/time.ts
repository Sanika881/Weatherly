const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function getCityLocalDate(unixSeconds: number, timezoneOffsetSec: number): Date {
  return new Date((unixSeconds + timezoneOffsetSec) * 1000);
}

export function getCityHour(unixSeconds: number, timezoneOffsetSec: number): number {
  return getCityLocalDate(unixSeconds, timezoneOffsetSec).getUTCHours();
}

export function formatCityTime(unixSeconds: number, timezoneOffsetSec: number): string {
  const date = getCityLocalDate(unixSeconds, timezoneOffsetSec);
  const hours24 = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

export function formatHourLabel(unixSeconds: number, timezoneOffsetSec: number, isNow = false): string {
  if (isNow) return 'Now';
  const hours24 = getCityHour(unixSeconds, timezoneOffsetSec);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12} ${period}`;
}

export function formatCityDate(unixSeconds: number, timezoneOffsetSec: number): string {
  const date = getCityLocalDate(unixSeconds, timezoneOffsetSec);
  const weekday = WEEKDAYS_SHORT[date.getUTCDay()];
  const month = MONTHS_SHORT[date.getUTCMonth()];
  const day = date.getUTCDate();
  return `${weekday}, ${month} ${day}`;
}

export function getDayLabel(unixSeconds: number, timezoneOffsetSec: number, index: number): string {
  if (index === 0) return 'Today';
  const date = getCityLocalDate(unixSeconds, timezoneOffsetSec);
  return WEEKDAYS_SHORT[date.getUTCDay()];
}

export function getCityDayKey(unixSeconds: number, timezoneOffsetSec: number): string {
  const d = getCityLocalDate(unixSeconds, timezoneOffsetSec);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getGreetingForOffset(nowUnixSec: number, timezoneOffsetSec: number): string {
  const hour = getCityHour(nowUnixSec, timezoneOffsetSec);
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Quiet night';
}
