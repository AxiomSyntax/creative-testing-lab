import { useState, useEffect, useLayoutEffect, useRef } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // ignore corrupt data
    }
    return initialValue;
  });

  // Re-read from localStorage when the key changes (e.g. project switch where
  // the component stays mounted instead of being remounted via Switch key=).
  const prevKey = useRef(key);
  useEffect(() => {
    if (prevKey.current === key) return;
    prevKey.current = key;
    try {
      const stored = localStorage.getItem(key);
      setValue(stored !== null ? (JSON.parse(stored) as T) : initialValue);
    } catch {
      setValue(initialValue);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Write to localStorage using layoutEffect so the write is guaranteed to
  // complete synchronously (before paint) on every render that changes the
  // value.  useEffect is deferred — if the component unmounts before the
  // deferred effect runs (e.g. fast navigation), the write is cancelled and
  // localStorage holds stale data on the next mount.
  const isFirstRender = useRef(true);
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage quota or private browsing
    }
  }, [key, value]);

  return [value, setValue];
}

export const CLB_KEYS = [
  "clb:market:form",
  "clb:market:avatar",
  "clb:market:angles",
  "clb:market:angleGenerated",
  "clb:market:avatarStrategy",
  "clb:competitors:rows",
  "clb:script:hooks",
  "clb:script:bodies",
  "clb:script:ctas",
  "clb:lab:experiments",
  "clb:iteration:form",
] as const;

export function clearAllStorage() {
  CLB_KEYS.forEach(k => localStorage.removeItem(k));
}
