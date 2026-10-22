import { useSyncExternalStore } from 'react';

/** CSS 미디어 쿼리가 맞는지 (예: '(max-width: 720px)') */
export function useMedia(query) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
