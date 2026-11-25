import {useId} from 'react';
import type {WeatherConditionKind} from '../types/weather';

interface WeatherIconProps {
  kind: WeatherConditionKind;
  size?: number;
  className?: string;
  reactionActive?: boolean;
  heatShimmer?: boolean;
}

export function WeatherIcon({
  kind,
  size = 32,
  className = '',
  reactionActive = false,
  heatShimmer = false,
}: WeatherIconProps) {
  const uid = useId().replace(/:/g, '');

  const sunGrad = `sun-${uid}`;
  const cloudGrad = `cloud-${uid}`;
  const moonGrad = `moon-${uid}`;
  const shimmerId = `shimmer-${uid}`;

  const showSunglasses = reactionActive && (kind === 'clear-day' || kind === 'partly-cloudy');
  const shakeCloud = reactionActive && (kind === 'rain' || kind === 'thunder' || kind === 'cloudy');
  const fastSnow = reactionActive && kind === 'snow';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${shakeCloud ? 'weatherly-anim-shake' : ''} ${className}`}
      style={heatShimmer ? {filter: `url(#${shimmerId})`} : undefined}
    >
      <defs>
        <linearGradient id={sunGrad} x1="16" y1="12" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="55%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <linearGradient id={cloudGrad} x1="16" y1="26" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id={moonGrad} x1="20" y1="14" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="100%" stopColor="#FDE047" />
        </linearGradient>
        {heatShimmer && (
          <filter id={shimmerId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.08" numOctaves="1" result="noise">
              <animate
                attributeName="baseFrequency"
                dur="3.5s"
                values="0.02 0.08;0.03 0.12;0.02 0.08"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" />
          </filter>
        )}
      </defs>

      {kind === 'clear-day' && (
        <g>
          <circle
            cx="32"
            cy="32"
            r="21"
            fill="#FDE047"
            opacity="0.22"
            className="weatherly-anim-breathe"
          />
          <g className="weatherly-anim-spin weatherly-hover-spin">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                x1="32"
                y1="7"
                x2="32"
                y2="13"
                stroke="#FBBF24"
                strokeWidth="3.2"
                strokeLinecap="round"
                transform={`rotate(${angle} 32 32)`}
              />
            ))}
          </g>
          <circle cx="32" cy="32" r="13.5" fill={`url(#${sunGrad})`} />
          {showSunglasses && (
            <g>
              <rect x="21" y="27" width="9.5" height="6.5" rx="2.5" fill="#0F1B3D" />
              <rect x="33.5" y="27" width="9.5" height="6.5" rx="2.5" fill="#0F1B3D" />
              <line x1="30.5" y1="29.5" x2="33.5" y2="29.5" stroke="#0F1B3D" strokeWidth="2" />
              <line x1="23" y1="29" x2="25" y2="29" stroke="#FFFFFF" strokeWidth="1" opacity="0.7" />
              <line x1="35.5" y1="29" x2="37.5" y2="29" stroke="#FFFFFF" strokeWidth="1" opacity="0.7" />
            </g>
          )}
        </g>
      )}

      {kind === 'clear-night' && (
        <g>
          <circle cx="33" cy="33" r="19" fill="#FEF08A" opacity="0.14" className="weatherly-anim-breathe" />
          <path
            d="M39.5 14.5C32.4 15.6 27 21.8 27 29.2C27 37.5 33.7 44.2 42 44.2C44.9 44.2 47.6 43.4 49.9 41.9C47.1 47.2 41.5 50.8 35.1 50.8C25.8 50.8 18.2 43.2 18.2 33.9C18.2 24.7 25.6 17.2 34.8 17C36.4 17 38 17.2 39.5 14.5Z"
            fill={`url(#${moonGrad})`}
          />
          <circle cx="47" cy="18" r="1.8" fill="#FEF08A" className="weatherly-anim-twinkle" />
          <circle cx="20" cy="18" r="1.4" fill="#FEF08A" className="weatherly-anim-twinkle" />
        </g>
      )}

      {kind === 'partly-cloudy' && (
        <g>
          <g transform="translate(8 -4)">
            <circle cx="34" cy="24" r="15" fill="#FDE047" opacity="0.2" className="weatherly-anim-breathe" />
            <g className="weatherly-anim-spin weatherly-hover-spin" style={{transformOrigin: '34px 24px'}}>
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <line
                  key={angle}
                  x1="34"
                  y1="10"
                  x2="34"
                  y2="14"
                  stroke="#FBBF24"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  transform={`rotate(${angle} 34 24)`}
                />
              ))}
            </g>
            <circle cx="34" cy="24" r="10.5" fill={`url(#${sunGrad})`} />
            {showSunglasses && (
              <g>
                <rect x="26" y="20" width="7" height="4.8" rx="1.8" fill="#0F1B3D" />
                <rect x="35" y="20" width="7" height="4.8" rx="1.8" fill="#0F1B3D" />
                <line x1="33" y1="22" x2="35" y2="22" stroke="#0F1B3D" strokeWidth="1.5" />
              </g>
            )}
          </g>
          <g className="weatherly-anim-drift weatherly-hover-drift">
            <path
              d="M21 49H44C48.4 49 52 45.4 52 41C52 36.9 48.9 33.6 45 33.1C43.7 27.9 39 24 33.5 24C27 24 21.8 29.1 21.5 35.5C17.8 36.1 15 39.3 15 43.1C15 46.4 17.7 49 21 49Z"
              fill={`url(#${cloudGrad})`}
            />
          </g>
        </g>
      )}

      {kind === 'cloudy' && (
        <g>
          <path
            d="M24 39H47C50.9 39 54 35.9 54 32C54 28.4 51.3 25.4 47.8 25C46.5 20.4 42.3 17 37.3 17C31.5 17 26.8 21.5 26.4 27.2C23.3 27.7 21 30.4 21 33.6C21 36.6 22.3 39 24 39Z"
            fill="#94A3B8"
            opacity="0.55"
          />
          <g className="weatherly-anim-drift weatherly-hover-drift">
            <path
              d="M19 49H43C47.4 49 51 45.4 51 41C51 36.9 47.9 33.6 44 33.1C42.7 27.9 38 24 32.5 24C26 24 20.8 29.1 20.5 35.5C16.8 36.1 14 39.3 14 43.1C14 46.4 16.7 49 19 49Z"
              fill={`url(#${cloudGrad})`}
            />
          </g>
        </g>
      )}

      {kind === 'rain' && (
        <g>
          <g className="weatherly-anim-drift weatherly-hover-drift">
            <path
              d="M19 41H44C48.4 41 52 37.4 52 33C52 28.9 48.9 25.6 45 25.1C43.7 19.9 39 16 33.5 16C27 16 21.8 21.1 21.5 27.5C17.8 28.1 15 31.3 15 35.1C15 38.4 16.7 41 19 41Z"
              fill={`url(#${cloudGrad})`}
            />
          </g>
          <g stroke="#38BDF8" strokeWidth="3" strokeLinecap="round">
            <line x1="23" y1="45" x2="21" y2="52" className="weatherly-anim-rain" />
            <line x1="33" y1="45" x2="31" y2="52" className="weatherly-anim-rain-delay" />
            <line x1="43" y1="45" x2="41" y2="52" className="weatherly-anim-rain" />
            {reactionActive && (
              <>
                <line x1="28" y1="47" x2="26" y2="55" className="weatherly-anim-rain" />
                <line x1="38" y1="47" x2="36" y2="55" className="weatherly-anim-rain-delay" />
              </>
            )}
          </g>
        </g>
      )}

      {kind === 'thunder' && (
        <g>
          <g className="weatherly-anim-drift weatherly-hover-drift">
            <path
              d="M19 40H44C48.4 40 52 36.4 52 32C52 27.9 48.9 24.6 45 24.1C43.7 18.9 39 15 33.5 15C27 15 21.8 20.1 21.5 26.5C17.8 27.1 15 30.3 15 34.1C15 37.4 16.7 40 19 40Z"
              fill="#CBD5E1"
            />
          </g>
          <path
            d="M34 39L27 49H33L30 58L40 46H34L37 39Z"
            fill="#FACC15"
            className="weatherly-anim-bolt"
          />
        </g>
      )}

      {kind === 'snow' && (
        <g className={fastSnow ? 'weatherly-anim-spin-fast' : ''}>
          <g className="weatherly-anim-drift">
            <path
              d="M19 41H44C48.4 41 52 37.4 52 33C52 28.9 48.9 25.6 45 25.1C43.7 19.9 39 16 33.5 16C27 16 21.8 21.1 21.5 27.5C17.8 28.1 15 31.3 15 35.1C15 38.4 16.7 41 19 41Z"
              fill={`url(#${cloudGrad})`}
            />
          </g>
          <g fill="#E0F2FE">
            <circle cx="23" cy="48" r="2.3" className="weatherly-anim-snow" />
            <circle cx="33" cy="51" r="2.3" className="weatherly-anim-snow" />
            <circle cx="43" cy="48" r="2.3" className="weatherly-anim-snow" />
          </g>
        </g>
      )}

      {kind === 'mist' && (
        <g
          className={`weatherly-anim-drift weatherly-hover-drift ${reactionActive ? 'opacity-60' : ''}`}
          stroke="#E2E8F0"
          strokeWidth="3.2"
          strokeLinecap="round"
        >
          <line x1="16" y1="24" x2="48" y2="24" opacity="0.7" />
          <line x1="12" y1="33" x2="52" y2="33" opacity="0.95" />
          <line x1="18" y1="42" x2="46" y2="42" opacity="0.8" />
        </g>
      )}
    </svg>
  );
}
