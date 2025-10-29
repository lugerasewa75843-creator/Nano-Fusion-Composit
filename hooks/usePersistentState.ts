import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';

export function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    db.settings.get(key).then(saved => {
      if (saved) {
        setValue(saved.value);
      }
    });
  }, [key]);

  const setPersistedValue = useCallback((newValue: T) => {
    setValue(newValue);
    db.settings.put({ key, value: newValue });
  }, [key]);

  return [value, setPersistedValue];
}
