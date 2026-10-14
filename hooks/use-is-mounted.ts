import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** True only after hydration. */
export const useIsMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
