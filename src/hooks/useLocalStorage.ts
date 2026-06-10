import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (item) setValue(JSON.parse(item));
    } catch {}
  }, [key]);

  const setStoredValue = (newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof newValue === 'function' ? (newValue as (p: T) => T)(prev) : newValue;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return [value, setStoredValue] as const;
}
