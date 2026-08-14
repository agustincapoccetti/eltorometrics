import { useEffect, useState } from "react";

/**
 * Estado que se recuerda entre pantallas y sesiones (localStorage).
 * Se usa para filtros compartidos del coach (puesto, período, etc.).
 */
export function useStickyState<T>(key: string, initial: T) {
  const storageKey = `etr.filter.${key}`;
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignorar */
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* ignorar */
    }
  }, [storageKey, value, hydrated]);

  return [value, setValue] as const;
}
