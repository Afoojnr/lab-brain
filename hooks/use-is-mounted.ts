import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * True only after hydration. Lets client-only values (the stored theme) render
 * after mount so server and first client render match.
 *
 * @returns Whether the component is running in the browser after hydration.
 */
export const useIsMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
