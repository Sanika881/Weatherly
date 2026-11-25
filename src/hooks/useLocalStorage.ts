import {useCallback, useState} from 'react';

interface VersionedEnvelope<T> {
  v: number;
  data: T;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  schemaVersion = 1,
  migrate?: (oldData: unknown, oldVersion: number) => T
): [T, (value: T | ((prev: T) => T)) => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return initialValue;
      const parsed = JSON.parse(raw) as Partial<VersionedEnvelope<T>>;
      if (parsed && typeof parsed.v === 'number' && 'data' in parsed) {
        if (parsed.v === schemaVersion) {
          return parsed.data as T;
        }
        if (migrate) {
          return migrate(parsed.data, parsed.v);
        }
      }
      return initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue, schemaVersion, migrate]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          const envelope: VersionedEnvelope<T> = {v: schemaVersion, data: next};
          window.localStorage.setItem(key, JSON.stringify(envelope));
        } catch {
          // Graceful fallback if storage is blocked or full
        }
        return next;
      });
    },
    [key, schemaVersion]
  );

  return [storedValue, setValue];
}
