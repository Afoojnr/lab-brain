import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

const subscribe = (onChange: () => void) => {
  const mediaQueryList = window.matchMedia(MOBILE_QUERY);
  mediaQueryList.addEventListener('change', onChange);
  return () => mediaQueryList.removeEventListener('change', onChange);
};

const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;

// The server cannot know the viewport, so it renders the desktop layout.
const getServerSnapshot = () => false;

/**
 * Whether the viewport is below the mobile breakpoint. Subscribes to the media
 * query instead of setting state in an effect, so it never causes a cascading render.
 *
 * @returns True on viewports narrower than 768px.
 */
export const useIsMobile = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
