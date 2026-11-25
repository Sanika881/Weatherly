import {useCallback, useEffect, useState} from 'react';
import type {CityLocation} from '../types/weather';

export const DEFAULT_CITY: CityLocation = {
  id: '51.507,-0.128',
  name: 'London',
  country: 'GB',
  lat: 51.5074,
  lon: -0.1278,
};

export interface GeolocationState {
  location: CityLocation;
  isLocating: boolean;
  permissionDenied: boolean;
  requestLocation: () => void;
}

export function useGeolocation(initialLocation?: CityLocation): GeolocationState {
  const [location, setLocation] = useState<CityLocation>(initialLocation ?? DEFAULT_CITY);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermissionDenied(true);
      setLocation((prev) => prev || DEFAULT_CITY);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLocation({
          id: `${lat.toFixed(3)},${lon.toFixed(3)}`,
          name: 'Your location',
          country: '',
          lat,
          lon,
        });
        setPermissionDenied(false);
        setIsLocating(false);
      },
      () => {
        setPermissionDenied(true);
        setIsLocating(false);
      },
      {enableHighAccuracy: false, timeout: 6000, maximumAge: 300000}
    );
  }, []);

  useEffect(() => {
    // Only auto-probe geolocation if no explicit initial location was restored
    if (initialLocation) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let active = true;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!active) return;
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLocation({
          id: `${lat.toFixed(3)},${lon.toFixed(3)}`,
          name: 'Your location',
          country: '',
          lat,
          lon,
        });
        setIsLocating(false);
      },
      () => {
        if (!active) return;
        setPermissionDenied(true);
        setIsLocating(false);
      },
      {enableHighAccuracy: false, timeout: 4500, maximumAge: 300000}
    );

    return () => {
      active = false;
    };
  }, [initialLocation]);

  return {location, isLocating, permissionDenied, requestLocation};
}
